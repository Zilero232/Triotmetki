from __future__ import absolute_import, division, print_function, unicode_literals

import threading
import time
import unittest

import _support  # noqa: F401
from otmetki.core.codec import parse_retry_after
from otmetki.core.net.backoff import backoff_delay
from otmetki.core.net.signing import server_time
from otmetki.core.net.transport import (
    NETWORK_ERROR,
    StoppableBody,
    SyncTransport,
    ThreadTransport,
    is_allowed_url,
    perform,
    response_headers,
    verified_context,
)
from otmetki.core.net.transport import tls

try:
    from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
except ImportError:
    from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        if self.path == '/redirect':
            self.reply(302, {'Location': '/ok'}, b'')
            return
        if self.path == '/big':
            self.reply(200, {}, b'x' * 5000)
            return
        if self.path == '/big-error':
            self.reply(500, {}, b'x' * 5000)
            return
        status = 200 if self.path == '/ok' else 429
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Retry-After', '7')
        self.end_headers()
        self.wfile.write(b'{"echo":' + str(len(body)).encode('ascii') + b'}')

    def reply(self, status, headers, body):
        self.send_response(status)
        for name, value in headers.items():
            self.send_header(name, value)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


class FakeContext(object):

    def __init__(self, verify_mode, check_hostname):
        self.verify_mode = verify_mode
        self.check_hostname = check_hostname


def fake_ssl(verify_mode=2, check_hostname=True, create=True):
    attrs = {'CERT_REQUIRED': 2}
    if create:
        attrs['create_default_context'] = staticmethod(lambda: FakeContext(verify_mode, check_hostname))
    return type(str('FakeSsl'), (object,), attrs)()


# Nothing listens on port 1; Windows retries a refused connect until the timeout, so it stays short.
UNREACHABLE_TIMEOUT_S = 0.2


def wait_for(transport, results, count, timeout=5.0):
    deadline = time.time() + timeout
    while len(results) < count and time.time() < deadline:
        transport.poll()
        time.sleep(0.01)


def echo(length):
    return b'{"echo":' + str(length).encode('ascii') + b'}'


def header_values(headers, name):
    return [value for key, value in headers.items() if key.lower() == name]


def broken_headers():
    raise RuntimeError('no headers')


def response_with_headers_attribute(headers):
    return type(str('R'), (object,), {'headers': headers})()


class FetchResponse(object):

    def __init__(self, headers):
        self._headers = headers

    def headers(self):
        return self._headers


class LocalServerTestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(('127.0.0.1', 0), Handler)
        cls.server.handle_error = lambda request, address: None
        cls.thread = threading.Thread(target=cls.server.serve_forever)
        cls.thread.daemon = True
        cls.thread.start()
        cls.base = 'http://127.0.0.1:%d' % cls.server.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.results = []

    def record(self, *reply):
        self.results.append(reply)


class ThreadTransportTest(LocalServerTestCase):

    def exchange(self, path, headers, body):
        transport = ThreadTransport(timeout=5)
        main = threading.current_thread()

        def done(status, reply_body, reply_headers):
            self.results.append((status, reply_body, threading.current_thread() is main, reply_headers))

        transport.request('POST', self.base + path, headers, body, done)
        wait_for(transport, self.results, 1)
        transport.stop()
        return self.results

    def test_callbacks_run_on_the_poll_thread(self):
        results = self.exchange('/ok', {'Content-Type': 'application/json'}, b'{"a":1}')

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0][:3], (200, b'{"echo":7}', True))

    def test_an_error_status_comes_with_the_response_headers(self):
        results = self.exchange('/busy', {}, b'')

        status, _, _, headers = results[0]
        self.assertEqual(status, 429)
        self.assertEqual(header_values(headers, 'retry-after'), ['7'])

    def test_network_error(self):
        transport = ThreadTransport(timeout=UNREACHABLE_TIMEOUT_S)
        transport.request('POST', 'http://127.0.0.1:1/nothing', {}, b'', self.record)

        wait_for(transport, self.results, 1)

        transport.stop()
        self.assertEqual([reply[0] for reply in self.results], [NETWORK_ERROR])


class SyncTransportTest(LocalServerTestCase):

    def test_answers_inside_request(self):
        body = b'--b' + b'x' * 70000 + b'--b--'
        headers = {'Content-Type': 'multipart/form-data; boundary=b'}

        SyncTransport(timeout=5).request('POST', self.base + '/ok', headers, body, self.record)

        self.assertEqual(len(self.results), 1)
        self.assertEqual(self.results[0][0], 200)
        self.assertEqual(self.results[0][1], echo(70008))

    def test_network_error_is_reported(self):
        SyncTransport(timeout=UNREACHABLE_TIMEOUT_S).request('POST', 'http://127.0.0.1:1/x', {}, b'x', self.record)

        self.assertEqual(self.results[0][0], NETWORK_ERROR)

    def test_a_stoppable_body_is_streamed_whole_every_time(self):
        body = StoppableBody(b'y' * 200000, lambda: False)
        headers = {'Content-Type': 'application/octet-stream'}
        transport = SyncTransport(timeout=5)

        for _ in range(2):
            transport.request('POST', self.base + '/ok', headers, body, self.record)

        self.assertEqual([result[1] for result in self.results], [b'{"echo":200000}'] * 2)

    def test_a_stopped_body_ends_the_exchange(self):
        body = StoppableBody(b'z' * 200000, lambda: True)

        SyncTransport(timeout=5).request('POST', self.base + '/ok', {}, body, self.record)

        self.assertEqual(self.results[0][0], NETWORK_ERROR)


class GuardTest(LocalServerTestCase):

    def test_a_redirect_comes_back_as_its_status_and_is_not_followed(self):
        status, body, headers = perform('POST', self.base + '/redirect', {}, b'', 5)

        self.assertEqual(status, 302)
        self.assertEqual(header_values(headers, 'location'), ['/ok'])

    def test_an_answer_over_the_cap_is_a_network_error(self):
        self.assertEqual(perform('POST', self.base + '/big', {}, b'', 5, max_bytes=4096)[0], NETWORK_ERROR)

    def test_an_error_answer_over_the_cap_is_a_network_error(self):
        self.assertEqual(perform('POST', self.base + '/big-error', {}, b'', 5, max_bytes=4096)[0], NETWORK_ERROR)

    def test_an_answer_at_the_cap_comes_through(self):
        status, body, _ = perform('POST', self.base + '/big', {}, b'', 5, max_bytes=5000)

        self.assertEqual((status, len(body)), (200, 5000))

    def test_plain_http_to_another_host_is_never_sent(self):
        self.assertEqual(perform('GET', 'http://example.invalid/x', {}, None, 1), (NETWORK_ERROR, b'', {}))

    def test_https_without_a_verified_context_is_never_sent(self):
        saved = dict(tls._cache)
        tls._cache['context'] = None
        try:
            answer = perform('GET', 'https://127.0.0.1:1/x', {}, None, UNREACHABLE_TIMEOUT_S)
            self.assertEqual(answer, (NETWORK_ERROR, b'', {}))
        finally:
            tls._cache.clear()
            tls._cache.update(saved)


class VerifiedContextTest(unittest.TestCase):

    def test_the_default_context_verifies_the_chain_and_the_host(self):
        context = verified_context(fake_ssl())

        self.assertEqual((context.verify_mode, context.check_hostname), (2, True))

    def test_no_context_without_create_default_context(self):
        self.assertIsNone(verified_context(fake_ssl(create=False)))

    def test_no_context_when_it_does_not_require_a_certificate(self):
        self.assertIsNone(verified_context(fake_ssl(verify_mode=0)))

    def test_no_context_when_it_does_not_check_the_host_name(self):
        self.assertIsNone(verified_context(fake_ssl(check_hostname=False)))

    def test_this_python_makes_a_verifying_context(self):
        import ssl

        context = verified_context()

        self.assertEqual((context.verify_mode, context.check_hostname), (ssl.CERT_REQUIRED, True))


class AllowedUrlTest(unittest.TestCase):

    def test_https_anywhere(self):
        self.assertTrue(is_allowed_url('https://api.triotmetki.ru/mod/ingest'))

    def test_plain_http_only_to_loopback(self):
        self.assertTrue(is_allowed_url('http://127.0.0.1:4000/mod/ingest'))
        self.assertTrue(is_allowed_url('http://localhost:4000/mod/ingest'))
        self.assertFalse(is_allowed_url('http://api.triotmetki.ru/mod/ingest'))
        self.assertFalse(is_allowed_url('http://localhost.evil.example/mod/ingest'))

    def test_userinfo_and_other_schemes_are_refused(self):
        self.assertFalse(is_allowed_url('https://user:pass@api.triotmetki.ru/'))
        self.assertFalse(is_allowed_url('https://api.triotmetki.ru@evil.example/'))
        self.assertFalse(is_allowed_url('ftp://api.triotmetki.ru/'))
        self.assertFalse(is_allowed_url('file:///etc/passwd'))


class BackoffTest(unittest.TestCase):

    def test_a_retry_after_thousands_of_attempts_waits_the_longest_delay(self):
        delay = backoff_delay(5000, 5.0, 600.0, 0.0, lambda: 0.5)

        self.assertEqual(delay, 600.0)


class ResponseHeadersTest(unittest.TestCase):

    def test_headers_method_of_the_client_response(self):
        response = FetchResponse({'Retry-After': '9', 'X-Otmetki-Server-Time': '1790000600'})

        headers = response_headers(response)

        self.assertEqual(parse_retry_after(headers), 9.0)
        self.assertEqual(server_time(headers), 1790000600.0)

    def test_header_pairs_become_text_and_bad_pairs_are_dropped(self):
        response = FetchResponse([('Retry-After', 3), ('bad',)])

        self.assertEqual(response_headers(response), {'Retry-After': '3'})

    def test_a_headers_dict_attribute(self):
        response = response_with_headers_attribute({'A': 'b'})

        self.assertEqual(response_headers(response), {'A': 'b'})

    def test_a_response_without_headers(self):
        self.assertEqual(response_headers(object()), {})

    def test_missing_headers(self):
        self.assertEqual(response_headers(FetchResponse(None)), {})

    def test_a_failing_headers_method(self):
        response = response_with_headers_attribute(staticmethod(broken_headers))

        self.assertEqual(response_headers(response), {})


if __name__ == '__main__':
    unittest.main()
