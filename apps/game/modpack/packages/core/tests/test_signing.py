from __future__ import absolute_import, division, print_function, unicode_literals

import time
import unittest

import _support
from otmetki.core.net import signing
from otmetki.core.net.signing import (
    DEVICE_HEADER,
    NONCE_HEADER,
    SERVER_TIME_HEADER,
    SIGNATURE_HEADER,
    STALE_REQUEST_STATUS,
    TIMESTAMP_HEADER,
    SignedRequest,
    request_path,
    server_time,
    sign,
    signed_headers,
    signed_message,
    signed_request,
    sync_clock,
)

SERVER_SIGNATURE_VECTOR = '7c6576dee0e349dfbd5997cdc94ebf348ddd00ff669762e869f89074eb845078'
SECRET = 's' * 40
INGEST_URL = 'https://api.example/mod/ingest'
REPLAY_URL = 'https://api.example/replays/mod'
VISIBILITY_HEADER = 'X-Otmetki-Visibility'


def server_accepts(url, headers, body, signed_names=()):
    extra = [(name, headers[name]) for name in signed_names]
    message = signed_message(
        'POST',
        request_path(url),
        headers[TIMESTAMP_HEADER],
        headers[NONCE_HEADER],
        body,
        extra,
    )
    return _support.verify_signature(SECRET, message, headers[SIGNATURE_HEADER])


def ingest_headers():
    return signed_headers('dev-1', SECRET, b'{}', 'ua', 'POST', INGEST_URL)


def replay_headers_with_visibility():
    return signed_headers(
        'dev-1',
        SECRET,
        b'REPLAY',
        'ua',
        'POST',
        REPLAY_URL,
        now=1790000000,
        nonce='n' * 32,
        content_type='multipart/form-data',
        extra_headers=[(VISIBILITY_HEADER, 'public')],
    )


def sent_timestamp():
    return int(ingest_headers()[TIMESTAMP_HEADER])


class SigningTest(unittest.TestCase):

    def test_rfc4231_case_2(self):
        signature = sign('Jefe', 'what do ya want for nothing?')

        self.assertEqual(signature, 'sha256=5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843')

    def test_text_and_bytes_give_same_signature(self):
        self.assertEqual(sign(u'secret', u'{"a":1}'), sign(b'secret', b'{"a":1}'))

    def test_verify_accepts_the_signed_body(self):
        body = b'{"events":[]}'
        signature = sign('k' * 32, body)

        self.assertTrue(_support.verify_signature('k' * 32, body, signature))

    def test_verify_rejects_a_changed_body(self):
        body = b'{"events":[]}'
        signature = sign('k' * 32, body)

        self.assertFalse(_support.verify_signature('k' * 32, body + b' ', signature))

    def test_verify_rejects_another_secret(self):
        body = b'{"events":[]}'
        signature = sign('k' * 32, body)

        self.assertFalse(_support.verify_signature('x' * 32, body, signature))

    def test_signed_headers(self):
        headers = signed_headers(
            'dev-1',
            SECRET,
            b'{}',
            'otmetki.companion/0.1.0',
            'POST',
            'https://api.example/mod/ingest?x=1',
            now=1790000000.7,
            nonce='n' * 32,
        )

        expected = sign(SECRET, b'v2\nPOST\n/mod/ingest\n1790000000\n' + b'n' * 32 + b'\n{}')
        self.assertEqual(headers[DEVICE_HEADER], 'dev-1')
        self.assertEqual(headers[TIMESTAMP_HEADER], '1790000000')
        self.assertEqual(headers[NONCE_HEADER], 'n' * 32)
        self.assertEqual(headers[SIGNATURE_HEADER], expected)
        self.assertEqual(headers['Content-Type'], 'application/json')

    def test_signature_covers_the_request_path(self):
        headers = ingest_headers()

        self.assertTrue(server_accepts(INGEST_URL, headers, b'{}'))

    def test_signature_does_not_fit_another_path(self):
        headers = ingest_headers()

        self.assertFalse(server_accepts('https://api.example/mod/settings', headers, b'{}'))

    def test_every_request_gets_a_fresh_nonce(self):
        first = ingest_headers()
        second = ingest_headers()

        self.assertNotEqual(first[NONCE_HEADER], second[NONCE_HEADER])

    def test_nonce_length_is_within_the_server_limits(self):
        nonce = ingest_headers()[NONCE_HEADER]

        self.assertGreaterEqual(len(nonce), 16)
        self.assertLessEqual(len(nonce), 64)

    def test_request_path_drops_the_query(self):
        path = request_path('https://api.example/mod/settings/apply/7/result?a=1')

        self.assertEqual(path, '/mod/settings/apply/7/result')

    def test_request_path_of_a_bare_host_is_the_root(self):
        self.assertEqual(request_path('http://localhost:4000'), '/')

    def test_request_path_drops_the_fragment(self):
        self.assertEqual(request_path('https://api.example/mod/ingest#frag'), '/mod/ingest')

    def test_signed_message_upper_cases_the_method(self):
        self.assertEqual(signed_message('post', '/p', 5, 'n', b'x'), b'v2\nPOST\n/p\n5\nn\nx')

    def test_signed_header_lines_sit_between_the_nonce_and_the_body(self):
        message = signed_message('POST', '/p', 5, 'n', b'x', [(VISIBILITY_HEADER, 'public')])

        self.assertEqual(message, b'v2\nPOST\n/p\n5\nn\nx-otmetki-visibility:public\nx')

    def test_no_signed_header_lines_is_the_plain_message(self):
        message = signed_message('POST', '/p', 5, 'n', b'x', [])

        self.assertEqual(message, b'v2\nPOST\n/p\n5\nn\nx')

    def test_signed_headers_are_sent_and_match_the_server_vector(self):
        headers = replay_headers_with_visibility()

        self.assertEqual(headers[VISIBILITY_HEADER], 'public')
        self.assertEqual(headers[SIGNATURE_HEADER], 'sha256=' + SERVER_SIGNATURE_VECTOR)

    def test_signed_headers_are_covered_by_the_signature(self):
        headers = replay_headers_with_visibility()

        self.assertTrue(server_accepts(REPLAY_URL, headers, b'REPLAY', (VISIBILITY_HEADER,)))

    def test_leaving_out_a_signed_header_breaks_the_signature(self):
        headers = replay_headers_with_visibility()

        self.assertFalse(server_accepts(REPLAY_URL, headers, b'REPLAY'))


class SignedRequestTest(unittest.TestCase):

    def test_a_multipart_upload_is_sent_as_is_and_signed_over_the_raw_file(self):
        transport = _support.FakeTransport()
        request = SignedRequest(
            method='POST',
            url=REPLAY_URL,
            device_id='dev-1',
            secret=SECRET,
            body=b'--multipart REPLAY--',
            user_agent='ua',
            content_type='multipart/form-data',
            signed_body=b'REPLAY',
            extra_headers=[(VISIBILITY_HEADER, 'public')],
        )

        signed_request(transport, request, lambda *reply: None)

        sent = transport.requests[0]
        self.assertEqual(sent['body'], b'--multipart REPLAY--')
        self.assertEqual(sent['headers']['Content-Type'], 'multipart/form-data')
        self.assertEqual(sent['headers'][VISIBILITY_HEADER], 'public')
        self.assertTrue(server_accepts(REPLAY_URL, sent['headers'], b'REPLAY', (VISIBILITY_HEADER,)))

    def test_a_plain_request_is_json_signed_over_its_body(self):
        transport = _support.FakeTransport()
        request = SignedRequest(
            method='POST',
            url=INGEST_URL,
            device_id='dev-1',
            secret=SECRET,
            body=b'{}',
            user_agent='ua',
        )

        signed_request(transport, request, lambda *reply: None)

        sent = transport.requests[0]
        self.assertEqual(sent['headers']['Content-Type'], 'application/json')
        self.assertTrue(server_accepts(INGEST_URL, sent['headers'], b'{}'))


class ServerTimeTest(unittest.TestCase):

    def test_server_time_prefers_the_explicit_header(self):
        headers = {'x-otmetki-server-time': '1790000000', 'Date': 'Thu, 01 Jan 1970 00:00:00 GMT'}

        self.assertEqual(server_time(headers), 1790000000.0)

    def test_server_time_falls_back_to_the_date_header(self):
        self.assertEqual(server_time({'Date': 'Sun, 27 Sep 2026 10:00:00 GMT'}), 1790503200.0)

    def test_server_time_is_none_with_an_unreadable_date(self):
        self.assertIsNone(server_time({'Date': 'garbage'}))

    def test_server_time_is_none_without_headers(self):
        self.assertIsNone(server_time(None))


class ClockSkewTest(unittest.TestCase):

    def setUp(self):
        self.transport = _support.FakeTransport()
        self.replies = []

    def tearDown(self):
        signing._clock['offset'] = 0.0

    def send(self):
        request = SignedRequest(
            method='POST',
            url=INGEST_URL,
            device_id='dev-1',
            secret=SECRET,
            body=b'{}',
            user_agent='ua',
        )
        signed_request(self.transport, request, lambda *reply: self.replies.append(reply))

    def reply_statuses(self):
        return [reply[0] for reply in self.replies]

    def test_sync_clock_shifts_every_later_timestamp(self):
        synced = sync_clock({SERVER_TIME_HEADER: '1790000600'}, now=1790000000.0)

        self.assertTrue(synced)
        self.assertAlmostEqual(sent_timestamp(), time.time() + 600, delta=2)

    def test_sync_clock_handles_a_device_clock_that_runs_ahead(self):
        synced = sync_clock({'X-Otmetki-Server-Time': '1790000000'}, now=1790000900.0)

        self.assertTrue(synced)
        self.assertAlmostEqual(sent_timestamp(), time.time() - 900, delta=2)

    def test_sync_clock_keeps_the_offset_without_a_usable_header(self):
        signing._clock['offset'] = 42.0

        synced = sync_clock({'Date': 'garbage'}, now=1790000000.0)

        self.assertFalse(synced)
        self.assertAlmostEqual(sent_timestamp(), time.time() + 42, delta=2)

    def test_stale_request_is_resigned_once_with_the_server_clock(self):
        self.send()
        server_now = int(time.time()) + 3600
        server_clock = {SERVER_TIME_HEADER: str(server_now)}

        self.transport.respond(STALE_REQUEST_STATUS, b'{"error":"stale_request"}', server_clock)

        first = self.transport.requests[0]['headers']
        retried = self.transport.requests[1]['headers']
        self.assertEqual(len(self.transport.requests), 2)
        self.assertEqual(self.replies, [])
        self.assertAlmostEqual(int(retried[TIMESTAMP_HEADER]), server_now, delta=2)
        self.assertNotEqual(retried[NONCE_HEADER], first[NONCE_HEADER])
        self.assertTrue(server_accepts(INGEST_URL, retried, b'{}'))

    def test_the_resigned_request_reply_reaches_the_caller(self):
        self.send()
        self.transport.respond(STALE_REQUEST_STATUS, b'', {SERVER_TIME_HEADER: str(int(time.time()) + 3600)})

        self.transport.respond(200, b'{}')

        self.assertEqual(self.reply_statuses(), [200])

    def test_a_second_stale_reply_reaches_the_caller(self):
        self.send()
        self.transport.respond(STALE_REQUEST_STATUS, b'', {SERVER_TIME_HEADER: '1790000000'})

        self.transport.respond(STALE_REQUEST_STATUS, b'', {SERVER_TIME_HEADER: '1790000000'})

        self.assertEqual(len(self.transport.requests), 2)
        self.assertEqual(self.reply_statuses(), [STALE_REQUEST_STATUS])

    def test_other_errors_are_not_retried_even_with_server_time(self):
        self.send()

        self.transport.respond(401, b'{"error":"bad_signature"}', {SERVER_TIME_HEADER: '1790000000'})

        self.assertEqual(len(self.transport.requests), 1)
        self.assertEqual(self.reply_statuses(), [401])
        self.assertAlmostEqual(sent_timestamp(), time.time(), delta=2)

    def test_stale_reply_without_server_time_is_not_retried(self):
        self.send()

        self.transport.respond(STALE_REQUEST_STATUS)

        self.assertEqual(len(self.transport.requests), 1)
        self.assertEqual(self.reply_statuses(), [STALE_REQUEST_STATUS])


if __name__ == '__main__':
    unittest.main()
