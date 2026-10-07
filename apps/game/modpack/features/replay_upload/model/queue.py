from __future__ import absolute_import, division, print_function, unicode_literals

import random

from ....core.codec import parse_json_body
from ....core.compat import string_types, to_text
from ....core.net.backoff import backoff_delay
from .constants import (
    BASE_BACKOFF_S,
    DONE_STATUSES,
    DROP_STATUSES,
    FIRST_DELAY_S,
    JITTER,
    LOCATE_TIMEOUT_S,
    MAX_AGE_S,
    MAX_BACKOFF_S,
    MAX_PENDING,
    MAX_SEEN,
    OUTCOME_BY_RESULT,
    QUOTA_BACKOFF_S,
    QUOTA_CODE,
    REQUEST_INVALID,
    REQUEST_READY,
    WAIT_BY_RESULT,
    JobResult,
    Outcome,
)


def uploaded_replay_id(result):
    if not isinstance(result, dict) or result.get('status') != 201:
        return None
    data = parse_json_body(result.get('body')) or {}
    replay_id = data.get('id')
    if not isinstance(replay_id, string_types) or not replay_id:
        return None
    return to_text(replay_id)


def classify_upload(status, body=None):
    if 200 <= status < 300 or status in DONE_STATUSES:
        return Outcome.DONE
    if status == 401:
        return Outcome.AUTH
    if status == 403:
        data = parse_json_body(body) or {}
        is_quota = data.get('code') == QUOTA_CODE
        return Outcome.QUOTA if is_quota else Outcome.AUTH
    if status in DROP_STATUSES:
        return Outcome.DROP
    return Outcome.RETRY


def _job_outcome(item, result, now):
    kind = result.get('result', JobResult.ERROR)
    if kind == JobResult.HTTP:
        return classify_upload(result.get('status', 0), result.get('body'))
    if kind == JobResult.MISSING and now - item['ended_at'] > LOCATE_TIMEOUT_S:
        return Outcome.DROP
    return OUTCOME_BY_RESULT.get(kind, Outcome.RETRY)


class ReplayQueue(object):

    def __init__(self, storage, max_pending=MAX_PENDING, max_seen=MAX_SEEN, rng=None):
        self.storage = storage
        self.max_pending = max_pending
        self.max_seen = max_seen
        self.rng = rng or random.random
        self.auth_blocked = False
        self.items = []
        self.seen = []
        self._load(storage.read({}))

    def _load(self, data):
        if not isinstance(data, dict):
            return
        items = data.get('items')
        seen = data.get('seen')
        if isinstance(items, list):
            self.items = [dict(item) for item in items if isinstance(item, dict) and item.get('arena_unique_id')]
        if isinstance(seen, list):
            self.seen = [to_text(value) for value in seen][-self.max_seen:]

    def _persist(self):
        self.storage.write({'items': self.items, 'seen': self.seen})

    def __len__(self):
        return len(self.items)

    def _find(self, arena_unique_id):
        for item in self.items:
            if item['arena_unique_id'] == arena_unique_id:
                return item
        return None

    def knows(self, arena_unique_id):
        key = to_text(arena_unique_id)
        return key in self.seen or self._find(key) is not None

    def _append(self, key, account_id, started_at, now, retry_at):
        self.items.append({
            'arena_unique_id': key,
            'account_id': int(account_id),
            'started_at': float(started_at) if started_at is not None else None,
            'ended_at': float(now),
            'attempt': 0,
            'retry_at': float(retry_at),
        })
        overflow = len(self.items) - self.max_pending
        if overflow > 0:
            for item in self.items[:overflow]:
                self._mark_seen(item['arena_unique_id'])
            self.items = self.items[overflow:]
        self._persist()

    def add(self, arena_unique_id, account_id, started_at, now):
        if not arena_unique_id or not account_id:
            return False
        key = to_text(arena_unique_id)
        if self.knows(key):
            return False

        self._append(key, account_id, started_at, now, float(now) + FIRST_DELAY_S)
        return True

    def request(self, arena_unique_id, account_id, started_at, now):
        if not arena_unique_id or not account_id:
            return REQUEST_INVALID
        key = to_text(arena_unique_id)

        item = self._find(key)
        if item is not None:
            item['retry_at'] = min(item['retry_at'], float(now))
            self._persist()
            return REQUEST_READY

        self.seen = [value for value in self.seen if value != key]
        self._append(key, account_id, started_at, now, now)
        return REQUEST_READY

    def next_item(self, now):
        if self.auth_blocked:
            return None

        expired = [item for item in self.items if now - item['ended_at'] > MAX_AGE_S]
        for item in expired:
            self._finish(item)
        if expired:
            self._persist()

        ready = [item for item in self.items if item['retry_at'] <= now]
        if not ready:
            return None
        return dict(min(ready, key=lambda item: item['retry_at']))

    def _mark_seen(self, key):
        if key not in self.seen:
            self.seen.append(key)
            self.seen = self.seen[-self.max_seen:]

    def _finish(self, item):
        self.items = [other for other in self.items if other is not item]
        self._mark_seen(item['arena_unique_id'])

    def _backoff(self, item, now, retry_after):
        item['attempt'] = item.get('attempt', 0) + 1
        delay = backoff_delay(item['attempt'], BASE_BACKOFF_S, MAX_BACKOFF_S, JITTER, self.rng, retry_after)
        item['retry_at'] = now + delay

    def _settle(self, item, outcome, now, retry_after):
        if outcome in (Outcome.DONE, Outcome.DROP):
            self._finish(item)
        elif outcome == Outcome.AUTH:
            self.auth_blocked = True
        elif outcome == Outcome.QUOTA:
            item['retry_at'] = now + QUOTA_BACKOFF_S
        elif outcome == Outcome.RETRY:
            self._backoff(item, now, retry_after)

    def complete(self, arena_unique_id, result, now, retry_after=None):
        item = self._find(to_text(arena_unique_id))
        if item is None:
            return Outcome.DROP
        result = result or {}

        outcome = _job_outcome(item, result, now)
        if outcome == Outcome.WAIT:
            item['retry_at'] = now + WAIT_BY_RESULT[result['result']]
        else:
            self._settle(item, outcome, now, retry_after)

        self._persist()
        return outcome

    def unblock(self):
        self.auth_blocked = False
