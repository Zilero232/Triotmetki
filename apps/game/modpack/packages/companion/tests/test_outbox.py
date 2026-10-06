from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.companion.binding import Credentials
from otmetki.core.codec import decode_json, parse_retry_after
from otmetki.companion.outbox import MAX_BACKOFF_S, Outbox, Outcome, classify_status
from otmetki.companion.sender import IngestEndpoint, IngestSender
from _support import verify_request
from otmetki.core.net.signing import DEVICE_HEADER
from _support import MemoryFile

INGEST_URL = 'https://api.example/mod/ingest'
STATUS_OUTCOMES = (
    (200, Outcome.SENT),
    (409, Outcome.SENT),
    (401, Outcome.AUTH),
    (403, Outcome.AUTH),
    (413, Outcome.SHRINK),
    (422, Outcome.DROP),
    (0, Outcome.RETRY),
    (503, Outcome.RETRY),
    (429, Outcome.RETRY),
)


def event(index):
    return {'type': 'queue', 'event_id': 'e%d' % index, 'occurred_at': index}


def outbox(**kwargs):
    return Outbox(MemoryFile(), rng=lambda: 0.5, **kwargs)


def outbox_with(*indexes, **kwargs):
    box = outbox(**kwargs)
    for index in indexes:
        box.enqueue(event(index))
    return box


def event_ids(events):
    return [item['event_id'] for item in events]


class ClassifyStatusTest(unittest.TestCase):

    def test_maps_each_status_to_its_outcome(self):
        outcomes = [(status, classify_status(status)) for status, _ in STATUS_OUTCOMES]

        self.assertEqual(outcomes, list(STATUS_OUTCOMES))


class OutboxTest(unittest.TestCase):

    def test_enqueue_accepts_a_new_event(self):
        box = outbox()

        self.assertTrue(box.enqueue(event(1)))

    def test_enqueue_rejects_a_duplicate_event_id(self):
        box = outbox_with(1)

        self.assertFalse(box.enqueue(event(1)))

    def test_next_batch_takes_the_oldest_events_up_to_the_batch_size(self):
        box = outbox_with(1, 2, 3, max_batch=2)

        batch = box.next_batch(0)

        self.assertEqual(event_ids(batch), ['e1', 'e2'])

    def test_a_sent_batch_leaves_the_queue(self):
        box = outbox_with(1, 2, 3, max_batch=2)
        batch = box.next_batch(0)

        outcome = box.complete(batch, 200, 0)

        self.assertEqual(outcome, Outcome.SENT)
        self.assertEqual(event_ids(box.next_batch(0)), ['e3'])

    def test_capacity_drops_oldest(self):
        box = outbox_with(0, 1, 2, 3, 4, max_events=3)

        self.assertEqual(event_ids(box.events), ['e2', 'e3', 'e4'])

    def test_a_failed_send_waits_for_the_first_backoff(self):
        box = outbox_with(1)
        batch = box.next_batch(100)

        outcome = box.complete(batch, 500, 100)

        self.assertEqual(outcome, Outcome.RETRY)
        self.assertEqual(box.retry_at, 105.0)

    def test_no_batch_before_the_retry_time(self):
        box = outbox_with(1)
        box.complete(box.next_batch(100), 500, 100)

        self.assertIsNone(box.next_batch(104))

    def test_a_batch_again_at_the_retry_time(self):
        box = outbox_with(1)
        box.complete(box.next_batch(100), 500, 100)

        self.assertIsNotNone(box.next_batch(105))

    def test_the_backoff_doubles_on_each_failure(self):
        box = outbox_with(1)
        batch = box.next_batch(100)
        box.complete(batch, 500, 100)

        box.complete(batch, 0, 105)

        self.assertEqual(box.retry_at, 115.0)

    def test_the_backoff_is_capped(self):
        box = outbox_with(1)
        batch = box.next_batch(0)

        for _ in range(21):
            box.complete(batch, 502, 0)

        self.assertEqual(box.retry_at, MAX_BACKOFF_S)

    def test_a_success_resets_the_backoff(self):
        box = outbox_with(1)
        batch = box.next_batch(0)
        for _ in range(3):
            box.complete(batch, 502, 0)

        box.complete(batch, 200, 0)

        self.assertEqual(box.attempt, 0)
        self.assertEqual(len(box), 0)

    def test_retry_after(self):
        box = outbox_with(1)

        box.complete(box.next_batch(0), 429, 0, retry_after=120)

        self.assertEqual(box.retry_at, 120.0)

    def test_drop_invalid(self):
        box = outbox_with(1)

        outcome = box.complete(box.next_batch(0), 422, 0)

        self.assertEqual(outcome, Outcome.DROP)
        self.assertEqual(len(box), 0)

    def test_auth_failure_blocks_sending_and_keeps_the_events(self):
        box = outbox_with(1)

        box.complete(box.next_batch(0), 401, 0)

        self.assertIsNone(box.next_batch(1000))
        self.assertEqual(len(box), 1)

    def test_unblock_resumes_sending(self):
        box = outbox_with(1)
        box.complete(box.next_batch(0), 401, 0)

        box.unblock()

        self.assertIsNotNone(box.next_batch(1000))

    def test_too_large_halves_the_batch(self):
        box = outbox_with(0, 1, 2, 3, max_batch=4)

        box.complete(box.next_batch(0), 413, 0)

        self.assertEqual(len(box.next_batch(0)), 2)

    def test_a_single_event_too_large_is_dropped(self):
        box = outbox_with(0, 1, 2, 3, max_batch=4)
        box.complete(box.next_batch(0), 413, 0)
        box.complete(box.next_batch(0), 413, 0)
        single = box.next_batch(0)

        box.complete(single, 413, 0)

        self.assertEqual(len(single), 1)
        self.assertEqual(len(box), 3)

    def test_events_persist_across_instances(self):
        storage = MemoryFile()
        box = Outbox(storage)
        box.enqueue(event(1))
        box.enqueue(event(2))

        restored = Outbox(storage)

        self.assertEqual(event_ids(restored.events), ['e1', 'e2'])

    def test_garbage_storage_is_an_empty_queue(self):
        box = Outbox(MemoryFile({'events': 'garbage'}))

        self.assertEqual(box.events, [])


class SenderTest(unittest.TestCase):

    def setUp(self):
        self.credentials = Credentials('dev_1', 's' * 43, 42)
        self.box = outbox()
        self.transport = _support.FakeTransport()
        self.responses = []
        self.auth_failures = []
        self.sender = IngestSender(
            self.box,
            self.credentials,
            self.transport,
            IngestEndpoint(url=INGEST_URL, user_agent='ua', mod_version='0.1.0', client_version='1.45.0'),
            on_response=self.responses.append,
            on_auth_failed=lambda: self.auth_failures.append(True),
            clock=lambda: 50.0,
        )

    def sent_request(self):
        self.box.enqueue(event(1))
        self.sender.tick(10)
        return self.transport.requests[0]

    def test_tick_sends_a_waiting_batch(self):
        self.box.enqueue(event(1))

        self.assertTrue(self.sender.tick(10))

    def test_the_batch_is_signed_with_the_device_secret(self):
        request = self.sent_request()

        self.assertEqual(request['method'], 'POST')
        self.assertEqual(request['headers'][DEVICE_HEADER], 'dev_1')
        is_signed = verify_request(self.credentials.secret, 'POST', INGEST_URL, request['headers'], request['body'])
        self.assertTrue(is_signed)

    def test_the_envelope_carries_the_account_and_the_events(self):
        envelope = decode_json(self.sent_request()['body'])

        self.assertEqual(envelope['account_id'], 42)
        self.assertEqual(envelope['device_id'], 'dev_1')
        self.assertEqual(envelope['sent_at'], 10)
        self.assertEqual(event_ids(envelope['events']), ['e1'])

    def test_one_batch_in_flight_at_a_time(self):
        self.sent_request()
        self.box.enqueue(event(2))

        self.assertFalse(self.sender.tick(11))

    def test_an_acknowledged_batch_passes_the_body_on_and_leaves_the_queue(self):
        self.sent_request()
        self.box.enqueue(event(2))

        self.transport.respond(200, b'{"accepted":1,"session":{"session_id":"s","wn8":1500}}')

        self.assertEqual(self.responses, [{'accepted': 1, 'session': {'session_id': 's', 'wn8': 1500}}])
        self.assertEqual(event_ids(self.box.events), ['e2'])
        self.assertTrue(self.sender.tick(12))

    def test_auth_failure_calls_back_and_stops_sending(self):
        self.sent_request()

        self.transport.respond(401, b'{"error":"bad_signature"}')

        self.assertEqual(self.auth_failures, [True])
        self.assertFalse(self.sender.tick(1000))

    def test_retry_uses_clock_and_header(self):
        self.sent_request()

        self.transport.respond(429, b'', {'Retry-After': '90'})

        self.assertEqual(self.box.retry_at, 140.0)

    def test_no_credentials_no_send(self):
        self.sender.credentials = None
        self.box.enqueue(event(1))

        sent = self.sender.tick(0)

        self.assertFalse(sent)
        self.assertEqual(self.transport.requests, [])


class RetryAfterTest(unittest.TestCase):

    def test_parses_seconds_with_any_header_case(self):
        self.assertEqual(parse_retry_after({'retry-after': ' 5 '}), 5.0)

    def test_ignores_an_http_date(self):
        self.assertIsNone(parse_retry_after({'Retry-After': 'Wed, 21 Oct 2015'}))

    def test_no_headers_no_delay(self):
        self.assertIsNone(parse_retry_after(None))


if __name__ == '__main__':
    unittest.main()
