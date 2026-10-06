from __future__ import absolute_import, division, print_function, unicode_literals

import io
import os
import threading

from ....core.codec import parse_retry_after
from ....core.net.signing import SignedRequest, signed_request
from ....core.net.transport import StoppableBody
from ....core.vendor import attr
from .constants import MAX_BYTES, SETTLE_S, VISIBILITY_HEADER, VISIBILITY_PRIVATE, JobResult, Outcome
from .files import build_multipart
from .queue import uploaded_replay_id

# upload_job runs on the worker thread: its transport must answer inside request() (transport.SyncTransport), so
# the 428 clock-skew retry of signing.signed_request happens there too. ReplayUploader drives it from the main
# thread, one upload in flight. Entering a battle pauses it: the running upload stops at its next block
# (StoppableBody) and is retried as it was, without a backoff, once the player is back in the hangar.


def _read_file(path, limit):
    with io.open(path, 'rb') as handle:
        return handle.read(limit + 1)


def _never():
    return False


@attr.s(frozen=True)
class Endpoint(object):

    transport = attr.ib()
    url = attr.ib()
    user_agent = attr.ib()
    credentials = attr.ib()
    visibility = attr.ib(default=VISIBILITY_PRIVATE)


@attr.s(frozen=True)
class ReplayFiles(object):

    find = attr.ib()
    read = attr.ib(default=_read_file)


def _refusal(result):
    return {'result': result}, None


def _read_found(item, files, now):
    # A replay renamed between the search and the read (the replay manager's auto-rename) is looked up again
    # once: the search goes by the file's header, not its name.
    for _ in range(2):
        found = files.find(item)
        if not found:
            return _refusal(JobResult.MISSING)
        path, size, mtime = found
        if size > MAX_BYTES:
            return _refusal(JobResult.TOO_LARGE)
        if size <= 0 or now - mtime < SETTLE_S:
            return _refusal(JobResult.BUSY)
        try:
            data = files.read(path, MAX_BYTES)
        except (IOError, OSError):
            continue
        if len(data) > MAX_BYTES:
            return _refusal(JobResult.TOO_LARGE)
        return None, (path, data)
    return _refusal(JobResult.MISSING)


def _send(endpoint, path, data, should_stop):
    content_type, body = build_multipart(os.path.basename(path), data)
    if should_stop is not None:
        body = StoppableBody(body, should_stop)
    reply = {}

    def done(status, response_body, response_headers):
        reply.update({'status': status, 'body': response_body, 'headers': response_headers or {}})

    credentials = endpoint.credentials
    request = SignedRequest(
        method='POST',
        url=endpoint.url,
        device_id=credentials.device_id,
        secret=credentials.secret,
        body=body,
        user_agent=endpoint.user_agent,
        content_type=content_type,
        signed_body=data,
        extra_headers=[(VISIBILITY_HEADER, endpoint.visibility)],
    )
    signed_request(endpoint.transport, request, done)
    return reply


def upload_job(item, endpoint, files, now, should_stop=None):
    stopped = should_stop or _never
    if stopped():
        return {'result': JobResult.STOPPED}

    refusal, found = _read_found(item, files, now)
    if refusal is not None:
        return refusal
    if stopped():
        return {'result': JobResult.STOPPED}

    path, data = found
    reply = _send(endpoint, path, data, should_stop)
    if stopped():
        return {'result': JobResult.STOPPED}
    if 'status' not in reply:
        return {'result': JobResult.ERROR}

    reply['result'] = JobResult.HTTP
    return reply


class ReplayUploader(object):

    def __init__(self, queue, endpoint, files, runner, clock, listener):
        self.queue = queue
        self.endpoint = endpoint
        self.files = files
        self.runner = runner
        self.clock = clock
        self.listener = listener
        self.in_flight = None
        self.paused = threading.Event()

    def pause(self):
        self.paused.set()

    def resume(self):
        self.paused.clear()

    def _can_start(self):
        if self.in_flight is not None or self.paused.is_set():
            return False
        credentials = self.endpoint.credentials
        return credentials is not None and credentials.is_valid()

    def tick(self, now):
        if not self._can_start():
            return False
        item = self.queue.next_item(now)
        if item is None:
            return False

        self.in_flight = item['arena_unique_id']
        endpoint = self.endpoint
        files = self.files
        clock = self.clock
        should_stop = self.paused.is_set

        def job():
            return upload_job(item, endpoint, files, clock(), should_stop)

        self.runner.submit(job, self._complete)
        return True

    def _complete(self, result):
        arena_unique_id = self.in_flight
        self.in_flight = None
        if arena_unique_id is None:
            return

        retry_after = parse_retry_after((result or {}).get('headers'))
        outcome = self.queue.complete(arena_unique_id, result, self.clock(), retry_after)

        if outcome == Outcome.AUTH:
            self.listener.on_auth_failed()
        elif outcome == Outcome.DONE:
            self.listener.on_uploaded(arena_unique_id, uploaded_replay_id(result))
