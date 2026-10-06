# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import os
import re
import shutil
import struct
import tempfile
import threading
import time
import unittest

import _support
from otmetki.companion.binding import Credentials
from otmetki.companion.config import FEATURES, OPT_IN_FEATURES, Config
from otmetki.companion.i18n import Translator
from otmetki.core.net import signing
from otmetki.core.net.signing import (
    NONCE_HEADER,
    SERVER_TIME_HEADER,
    STALE_REQUEST_STATUS,
    TIMESTAMP_HEADER,
)
from otmetki.core.net.transport import BackgroundRunner
from otmetki.core.replay_file import EXTENSIONS, MAGIC, is_replay_name, parse_date_time, read_header, read_header_from
from _support import MemoryFile, verify_request
from otmetki.core.storage import JsonFile
from otmetki.core.vendor import attr
from otmetki.features.replay_upload.model import (
    Endpoint,
    JobResult,
    Outcome,
    ReplayFiles,
    ReplayQueue,
    ReplayUploader,
    battle_started_at,
    build_multipart,
    classify_upload,
    find_replay,
    matches,
    upload_job,
    upload_name,
    uploaded_replay_id,
)
from otmetki.features.replay_upload.model.constants import (
    BASE_BACKOFF_S,
    BUSY_RETRY_S,
    FILE_FIELD,
    FIRST_DELAY_S,
    LOCATE_RETRY_S,
    LOCATE_TIMEOUT_S,
    MATCH_WINDOW_S,
    MAX_AGE_S,
    MAX_BACKOFF_S,
    MAX_BYTES,
    QUOTA_BACKOFF_S,
    REQUEST_INVALID,
    REQUEST_READY,
    UPLOAD_PATH,
    VISIBILITY_HEADER,
    VISIBILITY_PRIVATE,
    VISIBILITY_PUBLIC,
)

ACCOUNT = 12345
OTHER = 777
ARENA = 4512345678901234567
URL = 'https://api.example' + UPLOAD_PATH
SIGNED = (VISIBILITY_HEADER,)
SECRET = 's' * 40
STARTED = 1790000000.0
REPLAY_PATH = '/replays/battle.wotreplay'
QUOTA_BODY = b'{"code":"SUBSCRIPTION_REQUIRED"}'


def local_stamp(epoch):
    return time.strftime('%d.%m.%Y %H:%M:%S', time.localtime(epoch))


def replay_bytes(player_id=ACCOUNT, arena_unique_id=ARENA, started=STARTED, stream=b'\x00' * 64):
    arena = {'playerID': player_id, 'dateTime': local_stamp(started), 'mapName': '14_siegfried_line'}
    blocks = [json.dumps(arena).encode('utf-8')]
    if arena_unique_id is not None:
        results = [{'arenaUniqueID': arena_unique_id, 'personal': {}}, {}, {}]
        blocks.append(json.dumps(results).encode('utf-8'))

    data = struct.pack(str('<II'), MAGIC, len(blocks))
    for block in blocks:
        data += struct.pack(str('<I'), len(block)) + block
    return data + stream


def creds():
    return Credentials('dev-1', SECRET, ACCOUNT)


def endpoint(transport, visibility=VISIBILITY_PRIVATE, credentials=None):
    return Endpoint(
        transport=transport,
        url=URL,
        user_agent='ua',
        credentials=credentials or creds(),
        visibility=visibility,
    )


def files_found(data, mtime):
    return ReplayFiles(
        find=lambda item: (REPLAY_PATH, len(data), mtime),
        read=lambda path, limit: data,
    )


def queued_item():
    return {'arena_unique_id': str(ARENA), 'account_id': ACCOUNT, 'started_at': STARTED}


def http_result(status, body=None):
    return {'result': JobResult.HTTP, 'status': status, 'body': body}


def new_queue(storage=None, **options):
    return ReplayQueue(storage or MemoryFile(), rng=lambda: 0.5, **options)


class SyncFakeTransport(object):

    def __init__(self, *responses):
        self.responses = list(responses)
        self.requests = []

    def request(self, method, url, headers, body, callback):
        self.requests.append({'method': method, 'url': url, 'headers': headers, 'body': body})
        status, response_body, response_headers = self.responses.pop(0) if self.responses else (201, b'{}', {})
        callback(status, response_body, response_headers)


class InlineRunner(object):

    def __init__(self):
        self.pending = []

    def submit(self, job, callback):
        self.pending.append((job, callback))

    def poll(self):
        handled = 0
        while self.pending:
            job, callback = self.pending.pop(0)
            callback(job())
            handled += 1
        return handled


class RecordingListener(object):

    def __init__(self):
        self.auth_failures = 0
        self.uploaded = []

    def on_auth_failed(self):
        self.auth_failures += 1

    def on_uploaded(self, arena_unique_id, replay_id):
        self.uploaded.append((arena_unique_id, replay_id))


class ReplayHeaderTest(unittest.TestCase):

    def test_reads_player_arena_and_start(self):
        header = read_header_from(io.BytesIO(replay_bytes()))

        self.assertEqual(header['player_id'], ACCOUNT)
        self.assertEqual(header['arena_unique_id'], str(ARENA))
        self.assertAlmostEqual(header['date_time'], STARTED, delta=1)

    def test_replay_without_results_block_has_no_arena(self):
        header = read_header_from(io.BytesIO(replay_bytes(arena_unique_id=None)))

        self.assertIsNone(header['arena_unique_id'])
        self.assertEqual(header['player_id'], ACCOUNT)

    def test_rejects_a_zip(self):
        self.assertIsNone(read_header_from(io.BytesIO(b'PK\x03\x04' + b'\x00' * 20)))

    def test_rejects_an_empty_file(self):
        self.assertIsNone(read_header_from(io.BytesIO(b'')))

    def test_rejects_a_truncated_replay(self):
        truncated = replay_bytes()[:20]

        self.assertIsNone(read_header_from(io.BytesIO(truncated)))

    def test_a_header_with_a_huge_number_is_refused_at_once(self):
        block = b'{"playerID":' + b'9' * 1000000 + b'}'
        data = struct.pack(str('<II'), MAGIC, 1) + struct.pack(str('<I'), len(block)) + block
        started = time.time()

        header = read_header_from(io.BytesIO(data))

        self.assertIsNone(header)
        self.assertLess(time.time() - started, 0.5)

    def test_a_missing_file_has_no_header(self):
        path = os.path.join(tempfile.gettempdir(), 'otmetki-no-such.wotreplay')

        self.assertIsNone(read_header(path))

    def test_date_time_reads_the_client_stamp(self):
        self.assertAlmostEqual(parse_date_time(local_stamp(STARTED)), STARTED, delta=1)

    def test_date_time_rejects_other_text(self):
        self.assertIsNone(parse_date_time('yesterday'))
        self.assertIsNone(parse_date_time(None))

    def test_replay_names(self):
        self.assertTrue(is_replay_name('20260927_1530_ussr-R04_T-34_14_siegfried_line.wotreplay'))
        self.assertTrue(is_replay_name('replay_last_battle.MTREPLAY'))
        self.assertFalse(is_replay_name('temp.wotreplay'))
        self.assertFalse(is_replay_name('notes.txt'))


class MatchesTest(unittest.TestCase):

    def own_header(self, **changes):
        header = {'player_id': ACCOUNT, 'arena_unique_id': str(ARENA), 'date_time': STARTED}
        header.update(changes)
        return header

    def test_own_replay_of_the_arena_matches_without_a_start(self):
        self.assertTrue(matches(self.own_header(), ACCOUNT, ARENA, None))

    def test_another_players_replay_never_matches(self):
        self.assertFalse(matches(self.own_header(), OTHER, ARENA, STARTED))

    def test_another_arena_never_matches(self):
        self.assertFalse(matches(self.own_header(arena_unique_id='1'), ACCOUNT, ARENA, STARTED))

    def test_early_leave_matches_by_the_start_time(self):
        early_leave = self.own_header(arena_unique_id=None, date_time=STARTED + 60)

        self.assertTrue(matches(early_leave, ACCOUNT, ARENA, STARTED))

    def test_early_leave_outside_the_window_does_not_match(self):
        late = self.own_header(arena_unique_id=None, date_time=STARTED + MATCH_WINDOW_S + 1)

        self.assertFalse(matches(late, ACCOUNT, ARENA, STARTED))

    def test_early_leave_without_a_start_does_not_match(self):
        early_leave = self.own_header(arena_unique_id=None, date_time=STARTED + 60)

        self.assertFalse(matches(early_leave, ACCOUNT, ARENA, None))

    def test_header_without_a_player_does_not_match(self):
        self.assertFalse(matches({'player_id': None, 'arena_unique_id': str(ARENA)}, ACCOUNT, ARENA, STARTED))

    def test_no_header_does_not_match(self):
        self.assertFalse(matches(None, ACCOUNT, ARENA, STARTED))


class FindReplayTest(unittest.TestCase):

    def setUp(self):
        self.folder = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.folder)

    def write(self, name, data, mtime):
        path = os.path.join(self.folder, name)
        with open(path, 'wb') as handle:
            handle.write(data)
        os.utime(path, (mtime, mtime))
        return path

    def test_finds_the_own_replay_of_the_arena(self):
        now = time.time()
        started = now - 600
        own = self.write('a.wotreplay', replay_bytes(started=started), now - 10)
        self.write('b.wotreplay', replay_bytes(player_id=OTHER, started=started), now - 5)
        self.write('c.wotreplay', replay_bytes(arena_unique_id=ARENA + 1, started=started), now - 4)
        self.write('temp.wotreplay', replay_bytes(started=started), now - 1)
        self.write('d.txt', replay_bytes(started=started), now - 1)

        found = find_replay(self.folder, ACCOUNT, ARENA, started)

        self.assertEqual(found[0], own)
        self.assertEqual(found[1], os.path.getsize(own))

    def test_ignores_files_older_than_the_battle(self):
        now = time.time()
        self.write('old.wotreplay', replay_bytes(started=now - 86400), now - 86400)

        self.assertIsNone(find_replay(self.folder, ACCOUNT, ARENA, now - 600))

    def test_missing_folder(self):
        self.assertIsNone(find_replay(os.path.join(self.folder, 'nope'), ACCOUNT, ARENA, STARTED))


class MultipartTest(unittest.TestCase):

    def test_single_file_part(self):
        content_type, body = build_multipart('battle.wotreplay', b'\x12\x32\x34\x11data', boundary='XyZ')

        self.assertEqual(content_type, 'multipart/form-data; boundary=XyZ')
        self.assertTrue(body.startswith(
            b'--XyZ\r\nContent-Disposition: form-data; name="file"; filename="battle.wotreplay"\r\n'
        ))
        self.assertIn(b'\r\n\r\n\x12\x32\x34\x11data\r\n--XyZ--\r\n', body)

    def test_the_file_field_is_named_file(self):
        self.assertEqual(FILE_FIELD, 'file')

    def test_random_boundary(self):
        first, _ = build_multipart('a.wotreplay', b'x')
        second, _ = build_multipart('a.wotreplay', b'x')

        self.assertNotEqual(first, second)

    def test_upload_name_drops_the_folder_and_unsafe_characters(self):
        path = u'C:\\replays\\20260927 "Т-34"\r\n.wotreplay'.replace('\\', os.sep)

        self.assertEqual(upload_name(path), '20260927_-34.wotreplay')

    def test_upload_name_lowers_the_extension(self):
        self.assertEqual(upload_name('x.MTREPLAY'), 'x.mtreplay')

    def test_upload_name_replaces_an_unknown_extension(self):
        self.assertEqual(upload_name('x.zip'), 'x.wotreplay')


class UploadJobTest(unittest.TestCase):

    def tearDown(self):
        signing._clock['offset'] = 0.0

    def run_job(self, transport, data=None, size=None, mtime=None, now=None):
        data = replay_bytes() if data is None else data
        now = time.time() if now is None else now
        found = (REPLAY_PATH, len(data) if size is None else size, now - 60 if mtime is None else mtime)
        files = ReplayFiles(find=lambda item: found, read=lambda path, limit: data)
        return upload_job(queued_item(), endpoint(transport), files, now)

    def test_posts_the_file_to_the_upload_url(self):
        transport = SyncFakeTransport((201, b'{"id":"x","status":"uploaded"}', {}))

        result = self.run_job(transport)

        request = transport.requests[0]
        self.assertEqual(result['result'], JobResult.HTTP)
        self.assertEqual(result['status'], 201)
        self.assertEqual(request['url'], URL)
        self.assertTrue(request['headers']['Content-Type'].startswith('multipart/form-data; boundary='))
        self.assertEqual(request['headers'][signing.DEVICE_HEADER], 'dev-1')
        self.assertIn(replay_bytes(), request['body'])

    def test_the_signature_covers_the_raw_file_not_the_form(self):
        transport = SyncFakeTransport((201, b'{}', {}))

        self.run_job(transport)

        request = transport.requests[0]
        headers = request['headers']
        self.assertTrue(verify_request(SECRET, 'POST', URL, headers, replay_bytes(), SIGNED))
        self.assertFalse(verify_request(SECRET, 'POST', URL, headers, request['body'], SIGNED))

    def test_the_signature_covers_the_url(self):
        transport = SyncFakeTransport((201, b'{}', {}))

        self.run_job(transport)

        headers = transport.requests[0]['headers']
        other_url = 'https://api.example/mod/ingest'
        self.assertFalse(verify_request(SECRET, 'POST', other_url, headers, replay_bytes(), SIGNED))

    def test_private_by_default_and_the_visibility_is_signed(self):
        transport = SyncFakeTransport((201, b'{}', {}))

        self.run_job(transport)

        headers = transport.requests[0]['headers']
        tampered = dict(headers)
        tampered[VISIBILITY_HEADER] = 'public'
        self.assertEqual(headers[VISIBILITY_HEADER], 'private')
        self.assertFalse(verify_request(SECRET, 'POST', URL, headers, replay_bytes()))
        self.assertFalse(verify_request(SECRET, 'POST', URL, tampered, replay_bytes(), SIGNED))

    def test_public_when_asked(self):
        transport = SyncFakeTransport((201, b'{}', {}))
        data = replay_bytes()
        now = time.time()

        upload_job(queued_item(), endpoint(transport, visibility='public'), files_found(data, now - 60), now)

        headers = transport.requests[0]['headers']
        self.assertEqual(headers[VISIBILITY_HEADER], 'public')
        self.assertTrue(verify_request(SECRET, 'POST', URL, headers, data, SIGNED))

    def test_stale_clock_is_resigned_once(self):
        server_now = int(time.time()) + 3600
        transport = SyncFakeTransport(
            (STALE_REQUEST_STATUS, b'', {SERVER_TIME_HEADER: str(server_now)}),
            (201, b'{}', {}),
        )

        result = self.run_job(transport)

        first, retried = [request['headers'] for request in transport.requests]
        self.assertEqual(result['status'], 201)
        self.assertAlmostEqual(int(retried[TIMESTAMP_HEADER]), server_now, delta=2)
        self.assertNotEqual(retried[NONCE_HEADER], first[NONCE_HEADER])
        self.assertTrue(verify_request(SECRET, 'POST', URL, retried, replay_bytes(), SIGNED))
        self.assertEqual(retried[VISIBILITY_HEADER], first[VISIBILITY_HEADER])

    def test_stale_clock_from_the_date_header(self):
        transport = SyncFakeTransport(
            (STALE_REQUEST_STATUS, b'', {'Date': 'Sun, 27 Sep 2026 10:00:00 GMT'}),
            (201, b'{}', {}),
        )

        result = self.run_job(transport)

        self.assertEqual(result['status'], 201)
        self.assertAlmostEqual(int(transport.requests[1]['headers'][TIMESTAMP_HEADER]), 1790503200, delta=5)

    def test_too_large_by_size_is_never_read_or_sent(self):
        transport = SyncFakeTransport()

        result = self.run_job(transport, size=MAX_BYTES + 1)

        self.assertEqual(result['result'], JobResult.TOO_LARGE)
        self.assertEqual(transport.requests, [])

    def test_too_large_after_reading(self):
        transport = SyncFakeTransport()
        grown = b'x' * (MAX_BYTES + 1)

        result = self.run_job(transport, data=grown, size=10)

        self.assertEqual(result['result'], JobResult.TOO_LARGE)
        self.assertEqual(transport.requests, [])

    def test_exactly_the_limit_is_sent(self):
        result = self.run_job(SyncFakeTransport(), data=b'x' * MAX_BYTES)

        self.assertEqual(result['result'], JobResult.HTTP)

    def test_a_file_changed_a_moment_ago_waits(self):
        now = time.time()
        transport = SyncFakeTransport()

        result = self.run_job(transport, mtime=now - 1, now=now)

        self.assertEqual(result['result'], JobResult.BUSY)
        self.assertEqual(transport.requests, [])

    def test_an_empty_file_waits(self):
        transport = SyncFakeTransport()

        result = self.run_job(transport, size=0)

        self.assertEqual(result['result'], JobResult.BUSY)
        self.assertEqual(transport.requests, [])

    def test_missing_replay(self):
        files = ReplayFiles(find=lambda item: None)

        result = upload_job(queued_item(), endpoint(SyncFakeTransport()), files, time.time())

        self.assertEqual(result['result'], JobResult.MISSING)

    def test_a_replay_renamed_before_the_read_is_found_again(self):
        data = replay_bytes()
        paths = iter(['/replays/old.wotreplay', '/replays/renamed.wotreplay'])
        now = time.time()

        def read(path, limit):
            if path.endswith('old.wotreplay'):
                raise IOError('renamed')
            return data

        files = ReplayFiles(find=lambda item: (next(paths), len(data), now - 60), read=read)

        result = upload_job(queued_item(), endpoint(SyncFakeTransport((201, b'{}', {}))), files, now)

        self.assertEqual(result['result'], JobResult.HTTP)
        self.assertEqual(result['status'], 201)

    def test_async_transport_is_an_error(self):
        result = self.run_job(_support.FakeTransport())

        self.assertEqual(result['result'], JobResult.ERROR)

    def test_a_stopped_job_sends_nothing(self):
        transport = SyncFakeTransport()
        data = replay_bytes()
        now = time.time()

        result = upload_job(queued_item(), endpoint(transport), files_found(data, now - 60), now, lambda: True)

        self.assertEqual(result['result'], JobResult.STOPPED)
        self.assertEqual(transport.requests, [])


class ClassifyTest(unittest.TestCase):

    def test_created_is_done(self):
        self.assertEqual(classify_upload(201), Outcome.DONE)

    def test_a_duplicate_is_done(self):
        self.assertEqual(classify_upload(409, b'{"code":"REPLAY_DUPLICATE"}'), Outcome.DONE)

    def test_unauthorised_is_an_auth_failure(self):
        self.assertEqual(classify_upload(401), Outcome.AUTH)

    def test_forbidden_is_an_auth_failure(self):
        self.assertEqual(classify_upload(403, b'{"error":"x","code":"FORBIDDEN"}'), Outcome.AUTH)

    def test_forbidden_without_a_subscription_is_the_quota(self):
        self.assertEqual(classify_upload(403, QUOTA_BODY), Outcome.QUOTA)

    def test_a_rejected_replay_is_dropped(self):
        for status in (400, 413, 422):
            self.assertEqual(classify_upload(status), Outcome.DROP)

    def test_network_and_server_errors_are_retried(self):
        for status in (0, 428, 429, 500, 503):
            self.assertEqual(classify_upload(status), Outcome.RETRY)


class ReplayQueueTest(unittest.TestCase):

    def test_waits_for_the_client_to_finish_the_file(self):
        queue = new_queue()

        is_added = queue.add(ARENA, ACCOUNT, STARTED, 1000.0)

        self.assertTrue(is_added)
        self.assertIsNone(queue.next_item(1000.0))
        item = queue.next_item(1000.0 + FIRST_DELAY_S)
        self.assertEqual(item['arena_unique_id'], str(ARENA))
        self.assertEqual(item['account_id'], ACCOUNT)

    def test_the_same_arena_is_queued_once(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 1000.0)

        is_added = queue.add(str(ARENA), ACCOUNT, STARTED, 1001.0)

        self.assertFalse(is_added)
        self.assertEqual(len(queue), 1)

    def test_an_uploaded_arena_is_not_queued_again(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 1000.0)
        queue.complete(ARENA, http_result(201), 1100.0)

        is_added = queue.add(ARENA, ACCOUNT, STARTED, 1200.0)

        self.assertFalse(is_added)
        self.assertEqual(len(queue), 0)

    def test_needs_an_arena_and_an_account(self):
        queue = new_queue()

        self.assertFalse(queue.add(None, ACCOUNT, STARTED, 1200.0))
        self.assertFalse(queue.add(ARENA + 1, None, STARTED, 1200.0))

    def test_pending_and_seen_survive_a_restart(self):
        storage = MemoryFile()
        queue = new_queue(storage)
        queue.add(ARENA, ACCOUNT, STARTED, 1000.0)
        queue.add(ARENA + 1, ACCOUNT, STARTED, 1000.0)
        queue.complete(ARENA + 1, http_result(409), 1100.0)

        restored = new_queue(storage)

        self.assertEqual([item['arena_unique_id'] for item in restored.items], [str(ARENA)])
        self.assertFalse(restored.add(ARENA + 1, ACCOUNT, STARTED, 1200.0))
        self.assertEqual(restored.next_item(2000.0)['arena_unique_id'], str(ARENA))

    def test_persists_to_a_json_file(self):
        directory = tempfile.mkdtemp()
        path = os.path.join(directory, 'replays_%d.json' % ACCOUNT)
        try:
            ReplayQueue(JsonFile(path)).add(ARENA, ACCOUNT, STARTED, 1000.0)

            restored = ReplayQueue(JsonFile(path))

            self.assertEqual(len(restored), 1)
        finally:
            shutil.rmtree(directory)

    def test_a_server_error_backs_off(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        outcome = queue.complete(ARENA, http_result(503), 100.0)

        self.assertEqual(outcome, Outcome.RETRY)
        self.assertEqual(queue.items[0]['retry_at'], 100.0 + BASE_BACKOFF_S)

    def test_the_backoff_doubles_with_each_attempt(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)
        queue.complete(ARENA, http_result(503), 100.0)

        queue.complete(ARENA, {'result': JobResult.ERROR}, 200.0)

        self.assertEqual(queue.items[0]['retry_at'], 200.0 + 2 * BASE_BACKOFF_S)

    def test_the_backoff_honours_retry_after(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        queue.complete(ARENA, http_result(429), 300.0, retry_after=900)

        self.assertEqual(queue.items[0]['retry_at'], 1200.0)

    def test_the_backoff_is_capped(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        for _ in range(20):
            queue.complete(ARENA, {'result': JobResult.ERROR}, 300.0)

        self.assertEqual(queue.items[0]['retry_at'], 300.0 + MAX_BACKOFF_S)

    def test_auth_failure_pauses_everything(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        outcome = queue.complete(ARENA, http_result(401), 100.0)

        self.assertEqual(outcome, Outcome.AUTH)
        self.assertIsNone(queue.next_item(10000.0))

    def test_a_rebind_resumes_after_an_auth_failure(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)
        queue.complete(ARENA, http_result(401), 100.0)

        queue.unblock()

        self.assertIsNotNone(queue.next_item(10000.0))

    def test_quota_waits_long_without_dropping(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        outcome = queue.complete(ARENA, http_result(403, QUOTA_BODY), 100.0)

        self.assertEqual(outcome, Outcome.QUOTA)
        self.assertEqual(queue.items[0]['retry_at'], 100.0 + QUOTA_BACKOFF_S)
        self.assertFalse(queue.auth_blocked)

    def test_an_invalid_replay_is_dropped_and_remembered(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        outcome = queue.complete(ARENA, http_result(400), 100.0)

        self.assertEqual(outcome, Outcome.DROP)
        self.assertEqual(len(queue), 0)
        self.assertTrue(queue.knows(ARENA))

    def test_a_too_large_replay_is_dropped_and_remembered(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        outcome = queue.complete(ARENA, {'result': JobResult.TOO_LARGE}, 100.0)

        self.assertEqual(outcome, Outcome.DROP)
        self.assertEqual(len(queue), 0)
        self.assertTrue(queue.knows(ARENA))

    def test_a_missing_file_is_searched_for_again(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        outcome = queue.complete(ARENA, {'result': JobResult.MISSING}, 100.0)

        self.assertEqual(outcome, Outcome.WAIT)
        self.assertEqual(queue.items[0]['retry_at'], 100.0 + LOCATE_RETRY_S)

    def test_a_file_still_being_written_is_tried_again_soon(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        outcome = queue.complete(ARENA, {'result': JobResult.BUSY}, 200.0)

        self.assertEqual(outcome, Outcome.WAIT)
        self.assertEqual(queue.items[0]['retry_at'], 200.0 + BUSY_RETRY_S)

    def test_a_missing_file_is_given_up_after_the_search_timeout(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        outcome = queue.complete(ARENA, {'result': JobResult.MISSING}, LOCATE_TIMEOUT_S + 1)

        self.assertEqual(outcome, Outcome.DROP)
        self.assertEqual(len(queue), 0)

    def test_a_stopped_upload_is_ready_again_at_once(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        outcome = queue.complete(ARENA, {'result': JobResult.STOPPED}, 500.0)

        self.assertEqual(outcome, Outcome.WAIT)
        self.assertEqual(queue.items[0]['retry_at'], 500.0)
        self.assertEqual(queue.items[0]['attempt'], 0)

    def test_an_unknown_arena_completes_as_dropped(self):
        queue = new_queue()

        outcome = queue.complete(ARENA, http_result(201), 100.0)

        self.assertEqual(outcome, Outcome.DROP)

    def test_the_oldest_pending_replay_is_dropped_over_the_limit(self):
        queue = new_queue(max_pending=2)

        for offset in range(3):
            queue.add(ARENA + offset, ACCOUNT, STARTED, 0.0)

        self.assertEqual([item['arena_unique_id'] for item in queue.items], [str(ARENA + 1), str(ARENA + 2)])
        self.assertTrue(queue.knows(ARENA))

    def test_a_replay_older_than_the_age_limit_expires(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        item = queue.next_item(MAX_AGE_S + 1)

        self.assertIsNone(item)
        self.assertEqual(len(queue), 0)


class ManualRequestTest(unittest.TestCase):

    def test_a_requested_replay_is_sent_at_once(self):
        queue = new_queue()

        state = queue.request(ARENA, ACCOUNT, STARTED, 1000.0)

        self.assertEqual(state, REQUEST_READY)
        self.assertEqual(queue.next_item(1000.0)['arena_unique_id'], str(ARENA))

    def test_a_request_hurries_a_waiting_upload_without_a_second_item(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 1000.0)

        state = queue.request(str(ARENA), ACCOUNT, STARTED, 1001.0)

        self.assertEqual(state, REQUEST_READY)
        self.assertEqual(len(queue), 1)
        self.assertIsNotNone(queue.next_item(1001.0))

    def test_a_replay_given_up_on_can_be_asked_for_again(self):
        queue = new_queue()
        queue.add(ARENA, ACCOUNT, STARTED, 1000.0)
        queue.complete(ARENA, http_result(422), 1100.0)

        queue.request(ARENA, ACCOUNT, STARTED, 2000.0)

        self.assertEqual(queue.next_item(2000.0)['arena_unique_id'], str(ARENA))
        self.assertEqual(queue.seen.count(str(ARENA)), 0)

    def test_an_old_battle_requested_now_does_not_expire(self):
        queue = new_queue()

        queue.request(ARENA, ACCOUNT, STARTED - 30 * 24 * 3600, STARTED)

        self.assertIsNotNone(queue.next_item(STARTED + 60))

    def test_a_request_without_an_arena_is_invalid(self):
        queue = new_queue()

        state = queue.request(None, ACCOUNT, STARTED, 1000.0)

        self.assertEqual(state, REQUEST_INVALID)
        self.assertEqual(len(queue), 0)

    def test_a_request_without_an_account_is_invalid(self):
        queue = new_queue()

        state = queue.request(ARENA, None, STARTED, 1000.0)

        self.assertEqual(state, REQUEST_INVALID)
        self.assertEqual(len(queue), 0)


class BattleStartTest(unittest.TestCase):

    def test_the_moment_the_client_saw_wins(self):
        results = {'common': {'arenaCreateTime': 99}}

        started_at = battle_started_at(1234.0, results, lambda value: value - 10)

        self.assertEqual(started_at, 1234.0)

    def test_the_server_time_goes_through_the_client_conversion(self):
        results = {'common': {'arenaCreateTime': 1790000000}}

        started_at = battle_started_at(None, results, lambda value: value - 7200)

        self.assertEqual(started_at, 1789992800.0)

    def test_no_start_without_a_usable_time(self):
        unusable = (
            {},
            {'common': None},
            {'common': {'arenaCreateTime': 0}},
            {'common': {'arenaCreateTime': '1790000000'}},
            {'common': {'arenaCreateTime': True}},
            None,
        )
        for results in unusable:
            self.assertIsNone(battle_started_at(None, results, lambda value: value))

    def test_no_start_when_the_conversion_fails(self):
        results = {'common': {'arenaCreateTime': 5}}

        self.assertIsNone(battle_started_at(None, results, lambda value: None))


class ReplayUploaderTest(unittest.TestCase):

    def setUp(self):
        self.now = 1000.0
        self.queue = new_queue()
        self.runner = InlineRunner()
        self.data = replay_bytes()
        self.listener = RecordingListener()

    def uploader(self, transport, credentials=None):
        return ReplayUploader(
            queue=self.queue,
            endpoint=endpoint(transport, credentials=credentials),
            files=files_found(self.data, 0.0),
            runner=self.runner,
            clock=lambda: self.now,
            listener=self.listener,
        )

    def test_one_upload_at_a_time(self):
        uploader = self.uploader(SyncFakeTransport((201, b'{}', {})))
        self.queue.add(ARENA, ACCOUNT, STARTED, 0.0)
        self.queue.add(ARENA + 1, ACCOUNT, STARTED, 0.0)

        is_started = uploader.tick(self.now)
        is_second_started = uploader.tick(self.now)

        self.assertTrue(is_started)
        self.assertFalse(is_second_started)

    def test_a_finished_upload_reaches_the_listener(self):
        body = b'{"id": "7b0c2a44-1111-4111-8111-111111111111", "status": "uploaded"}'
        uploader = self.uploader(SyncFakeTransport((201, body, {})))
        self.queue.add(ARENA, ACCOUNT, STARTED, 0.0)
        self.queue.add(ARENA + 1, ACCOUNT, STARTED, 0.0)
        uploader.tick(self.now)

        handled = self.runner.poll()

        self.assertEqual(handled, 1)
        self.assertEqual(self.listener.uploaded, [(str(ARENA), '7b0c2a44-1111-4111-8111-111111111111')])
        self.assertEqual(len(self.queue), 1)

    def test_the_next_upload_starts_after_the_first_is_done(self):
        transport = SyncFakeTransport((201, b'{}', {}))
        uploader = self.uploader(transport)
        self.queue.add(ARENA, ACCOUNT, STARTED, 0.0)
        self.queue.add(ARENA + 1, ACCOUNT, STARTED, 0.0)
        uploader.tick(self.now)
        self.runner.poll()

        is_started = uploader.tick(self.now)
        self.runner.poll()

        self.assertTrue(is_started)
        self.assertEqual(len(transport.requests), 2)
        self.assertEqual(len(self.queue), 0)

    def test_sends_the_visibility_chosen_when_the_upload_starts(self):
        transport = SyncFakeTransport((201, b'{}', {}))
        uploader = self.uploader(transport)
        self.queue.add(ARENA, ACCOUNT, STARTED, 0.0)
        uploader.endpoint = attr.evolve(uploader.endpoint, visibility='public')

        uploader.tick(self.now)
        uploader.endpoint = attr.evolve(uploader.endpoint, visibility='private')
        self.runner.poll()

        self.assertEqual(transport.requests[0]['headers'][VISIBILITY_HEADER], 'public')

    def test_not_owned_replay_is_dropped(self):
        transport = SyncFakeTransport((422, b'{"error":"replay_not_owned","code":"VALIDATION_FAILED"}', {}))
        uploader = self.uploader(transport)
        self.queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        uploader.tick(self.now)
        self.runner.poll()

        self.assertEqual(len(self.queue), 0)
        self.assertTrue(self.queue.knows(ARENA))
        self.assertEqual(self.listener.auth_failures, 0)

    def test_auth_failure_reaches_the_listener_and_stops_the_uploads(self):
        uploader = self.uploader(SyncFakeTransport((401, b'{"error":"bad_signature"}', {})))
        self.queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        uploader.tick(self.now)
        self.runner.poll()

        self.assertEqual(self.listener.auth_failures, 1)
        self.assertFalse(uploader.tick(self.now))

    def test_retry_after_header_is_used(self):
        uploader = self.uploader(SyncFakeTransport((429, b'', {'Retry-After': '900'})))
        self.queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        uploader.tick(self.now)
        self.runner.poll()

        self.assertEqual(self.queue.items[0]['retry_at'], 1900.0)

    def test_paused_uploader_starts_nothing(self):
        uploader = self.uploader(SyncFakeTransport((201, b'{}', {})))
        self.queue.add(ARENA, ACCOUNT, STARTED, 0.0)
        uploader.pause()

        self.assertFalse(uploader.tick(self.now))

    def test_resumed_uploader_starts_again(self):
        uploader = self.uploader(SyncFakeTransport((201, b'{}', {})))
        self.queue.add(ARENA, ACCOUNT, STARTED, 0.0)
        uploader.pause()

        uploader.resume()

        self.assertTrue(uploader.tick(self.now))

    def test_needs_valid_credentials(self):
        uploader = self.uploader(SyncFakeTransport(), credentials=Credentials('dev-1', 'short', ACCOUNT))
        self.queue.add(ARENA, ACCOUNT, STARTED, 0.0)

        self.assertFalse(uploader.tick(self.now))


class PausingTransport(object):

    def __init__(self, pause):
        self.pause = pause
        self.is_first = True
        self.sent = []

    def _read_all(self, body):
        data = b''
        while True:
            block = body.read(8192)
            if not block:
                return data
            data += block

    def request(self, method, url, headers, body, callback):
        if self.is_first:
            self.is_first = False
            self.pause()
        try:
            data = self._read_all(body)
        except IOError:
            callback(0, b'', {})
            return
        self.sent.append(data)
        callback(201, b'{}', {})


class BattlePauseTest(unittest.TestCase):

    def setUp(self):
        self.now = 1000.0
        self.queue = new_queue()
        self.runner = InlineRunner()
        self.data = replay_bytes()
        self.listener = RecordingListener()
        self.uploader = ReplayUploader(
            queue=self.queue,
            endpoint=None,
            files=files_found(self.data, 0.0),
            runner=self.runner,
            clock=lambda: self.now,
            listener=self.listener,
        )
        self.transport = PausingTransport(self.uploader.pause)
        self.uploader.endpoint = endpoint(self.transport)
        self.queue.add(ARENA, ACCOUNT, STARTED, 0.0)

    def test_entering_a_battle_stops_the_running_upload(self):
        self.uploader.tick(self.now)

        self.runner.poll()

        item = self.queue.items[0]
        self.assertEqual(self.transport.sent, [])
        self.assertEqual(len(self.queue), 1)
        self.assertEqual(item['attempt'], 0)
        self.assertEqual(item['retry_at'], 1000.0)
        self.assertFalse(self.uploader.tick(self.now))

    def test_the_hangar_sends_the_stopped_upload_again(self):
        self.uploader.tick(self.now)
        self.runner.poll()
        self.uploader.resume()

        is_started = self.uploader.tick(self.now)
        self.runner.poll()

        self.assertTrue(is_started)
        self.assertEqual(self.listener.uploaded, [(str(ARENA), None)])
        self.assertIn(self.data, self.transport.sent[0])


class BackgroundRunnerTest(unittest.TestCase):

    def test_job_runs_off_thread_and_callback_on_poll(self):
        runner = BackgroundRunner('otmetki-test')
        seen = {}
        main = threading.current_thread()

        def job():
            seen['job_thread'] = threading.current_thread()
            return 42

        def done(result):
            seen['result'] = result
            seen['callback_thread'] = threading.current_thread()

        runner.submit(job, done)
        runner.submit(lambda: 1 // 0, lambda result: seen.setdefault('failed', result))
        deadline = time.time() + 5
        while 'failed' not in seen and time.time() < deadline:
            runner.poll()
            time.sleep(0.01)
        runner.stop()

        self.assertEqual(seen['result'], 42)
        self.assertIsNot(seen['job_thread'], main)
        self.assertIs(seen['callback_thread'], main)
        self.assertIsNone(seen['failed'])


def switch_label(language, name):
    return Translator(language)(name)


class ReplaySettingsTest(unittest.TestCase):

    def test_upload_is_an_opt_in_feature(self):
        self.assertIn('upload_replays', FEATURES)
        self.assertIn('upload_replays', OPT_IN_FEATURES)

    def test_upload_is_off_by_default(self):
        self.assertFalse(Config().is_enabled('upload_replays'))

    def test_upload_is_on_when_switched_on(self):
        self.assertTrue(Config({'upload_replays': True}).is_enabled('upload_replays'))

    def test_upload_is_off_with_the_whole_mod(self):
        self.assertFalse(Config({'upload_replays': True, 'enabled': False}).is_enabled('upload_replays'))

    def test_upload_switch_takes_only_a_boolean(self):
        self.assertFalse(Config({'upload_replays': 'yes'}).is_enabled('upload_replays'))

    def test_upload_switch_is_labelled(self):
        self.assertIn(u'реплеи', switch_label('ru', 'upload_replays'))

    def test_the_upload_switch_is_saved(self):
        self.assertEqual(Config().update({'upload_replays': True}), ['upload_replays'])

    def test_publishing_is_an_opt_in_feature(self):
        self.assertIn('publish_replays', FEATURES)
        self.assertIn('publish_replays', OPT_IN_FEATURES)

    def test_publishing_is_off_by_default(self):
        self.assertFalse(Config().is_enabled('publish_replays'))

    def test_publishing_is_on_when_switched_on(self):
        self.assertTrue(Config({'publish_replays': True}).is_enabled('publish_replays'))

    def test_the_publish_switch_is_saved(self):
        self.assertEqual(Config().update({'publish_replays': True}), ['publish_replays'])

    def test_publish_switch_sits_next_to_upload(self):
        self.assertEqual(FEATURES.index('publish_replays'), FEATURES.index('upload_replays') + 1)

    def test_publish_switch_is_labelled_in_both_languages(self):
        for language, word in (('ru', u'публичн'), ('en', u'public')):
            self.assertIn(word, switch_label(language, 'publish_replays').lower())


def contract_limits():
    return _support.schema('replay-upload.schema.json')['definitions']['limits']


def server_config_number(source, key):
    expression = re.search(key + r':\s*([\d\s*_]+),', source).group(1)
    value = 1
    for factor in expression.replace('_', '').split('*'):
        value *= int(factor)
    return value


def quoted_list(values):
    return ', '.join("'%s'" % value for value in values)


class ReplayContractTest(unittest.TestCase):

    def test_constants_match_the_contract(self):
        expected = {
            'path': UPLOAD_PATH,
            'field': FILE_FIELD,
            'max_bytes': MAX_BYTES,
            'extensions': list(EXTENSIONS),
            'visibility_header': VISIBILITY_HEADER,
            'visibilities': [VISIBILITY_PRIVATE, VISIBILITY_PUBLIC],
            'default_visibility': VISIBILITY_PRIVATE,
        }
        limits = contract_limits()['default']

        contract = {key: limits[key] for key in expected}

        self.assertEqual(contract, expected)

    def test_the_contract_defaults_are_its_constants(self):
        limits = contract_limits()

        constants = {key: value['const'] for key, value in limits['properties'].items()}

        self.assertEqual(constants, limits['default'])

    def test_contract_matches_the_server_config(self):
        server_dir = os.path.join(_support.MODPACK_DIR, '..', '..', 'web', 'server')
        path = os.path.join(server_dir, 'src', 'modules', 'replays', 'config', 'upload.constants.ts')
        if not os.path.exists(path):
            self.skipTest('server sources are not next to the mod')
        with io.open(path, 'r', encoding='utf-8') as handle:
            source = handle.read()

        limits = contract_limits()['default']

        self.assertEqual(server_config_number(source, 'maxBytes'), limits['max_bytes'])
        self.assertEqual(server_config_number(source, 'multipartOverheadBytes'), limits['multipart_overhead_bytes'])
        self.assertIn("field: '%s'" % limits['field'], source)
        self.assertIn('extensions: [%s]' % quoted_list(limits['extensions']), source)
        self.assertIn("visibilityHeader: '%s'" % limits['visibility_header'].lower(), source)
        self.assertIn('modVisibilities: [%s]' % quoted_list(limits['visibilities']), source)
        self.assertIn("modDefaultVisibility: '%s'" % limits['default_visibility'], source)

    def test_response_example_validates(self):
        validator = _support.schema_validator('replay-upload.schema.json', 'response')
        if validator is None:
            self.skipTest('jsonschema not installed')

        validator.validate({'id': '0b0f9a6e-9a36-4f59-8a61-1d1a4b6a0c11', 'status': 'uploaded'})


class UploadedReplayIdTest(unittest.TestCase):

    def test_id_from_a_201_body(self):
        body = b'{"id": "7b0c2a44-1111-4111-8111-111111111111", "status": "uploaded"}'

        replay_id = uploaded_replay_id({'status': 201, 'body': body})

        self.assertEqual(replay_id, '7b0c2a44-1111-4111-8111-111111111111')

    def test_no_id_from_a_duplicate(self):
        body = b'{"id": "7b0c2a44-1111-4111-8111-111111111111", "status": "uploaded"}'

        self.assertIsNone(uploaded_replay_id({'status': 409, 'body': body}))

    def test_no_id_from_a_body_that_is_not_json(self):
        self.assertIsNone(uploaded_replay_id({'status': 201, 'body': b'not json'}))

    def test_no_id_when_it_is_not_text(self):
        self.assertIsNone(uploaded_replay_id({'status': 201, 'body': b'{"id": 5}'}))

    def test_no_id_without_a_result(self):
        self.assertIsNone(uploaded_replay_id(None))


if __name__ == '__main__':
    unittest.main()
