# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from collections import OrderedDict

from ....core.vendor import six
from .constants import APPEND, HOLD, NOTICE_ARENAS_LIMIT, PUSH, STOCK_WAIT_S, UNCLAIMED_AFTER_S


def arena_key(arena):
    return None if arena is None else six.text_type(arena)


def _bounded(items):
    while len(items) > NOTICE_ARENAS_LIMIT:
        items.popitem(last=False)


class StockNotices(object):

    def __init__(self):
        self.held = OrderedDict()
        self.waiting = OrderedDict()
        self.released = OrderedDict()
        self.hangar_at = None

    def stock_arrived(self, arena, deliver, now):
        arena = arena_key(arena)
        if arena in self.held:
            return self.held.pop(arena)
        self.waiting[arena] = (deliver, now + STOCK_WAIT_S)
        self._release_the_oldest_waiting()
        return None

    def _release_the_oldest_waiting(self):
        while len(self.waiting) > NOTICE_ARENAS_LIMIT:
            arena, (deliver, _until) = self.waiting.popitem(last=False)
            self.released[arena] = True
            deliver([])

        _bounded(self.released)

    def results_arrived(self, arena, results):
        arena = arena_key(arena)
        if arena in self.waiting:
            deliver, _ = self.waiting.pop(arena)
            return APPEND, deliver
        if self.released.pop(arena, None) is not None:
            return PUSH, None
        self.held[arena] = results
        _bounded(self.held)
        return HOLD, None

    def entered_hangar(self, now):
        self.hangar_at = now

    def left_hangar(self):
        self.hangar_at = None

    def expired(self, now):
        late = [arena for arena, (_, until) in self.waiting.items() if now >= until]
        delivers = []
        for arena in late:
            deliver, _ = self.waiting.pop(arena)
            self.released[arena] = True
            delivers.append(deliver)
        _bounded(self.released)
        return delivers, self._unclaimed(now)

    def _unclaimed(self, now):
        if self.hangar_at is None or now - self.hangar_at < UNCLAIMED_AFTER_S or not self.held:
            return []
        results = list(self.held.values())
        self.held.clear()
        return results


# The client formats the message as a Python 2 UTF-8 byte string.
def with_lines(message, lines):
    if not lines:
        return message
    if isinstance(message, six.binary_type):
        return b'\n'.join([message] + [six.ensure_binary(line, 'utf-8') for line in lines])
    return u'\n'.join([six.ensure_text(message)] + [six.ensure_text(line) for line in lines])
