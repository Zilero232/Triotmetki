# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from collections import OrderedDict  # novermin (2.7 has it; vermin counts 3.1 for the 3.x line)

from ....core.vendor import six
from .constants import NOTICE_ARENAS_LIMIT, STOCK_WAIT_S, UNCLAIMED_AFTER_S

APPEND = 'append'
PUSH = 'push'
HOLD = 'hold'


# The stock message names its arena by the results' int arenaUniqueID, a battle event by its text (companion payload).
def arena_key(arena):
    return None if arena is None else six.text_type(arena)


def _bounded(items):
    while len(items) > NOTICE_ARENAS_LIMIT:
        items.popitem(last=False)


# PMOD's «подменить после-боевые сообщения»: one message per battle, the stock one, with the mod's lines added. The
# battle's results and its stock message meet here by arena whichever comes first; a message waits STOCK_WAIT_S for
# its results, results wait for their message until UNCLAIMED_AFTER_S after the hangar opened. `stock_arrived` gives
# the held results the message takes (None: it waits); `results_arrived` says whether to APPEND them to the waiting
# message (with its deliver), PUSH a message of their own (the stock one went without them) or HOLD them; `expired`
# gives the delivers of the messages that waited long enough and the held results no message took.
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
        _bounded(self.waiting)
        return None

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


# The template's own lines are plain newlines, and the client formats the message as a Python 2 byte string (UTF-8),
# so the lines join it as bytes then.
def with_lines(message, lines):
    if not lines:
        return message
    if isinstance(message, six.binary_type):
        return b'\n'.join([message] + [six.ensure_binary(line, 'utf-8') for line in lines])
    return u'\n'.join([six.ensure_text(message)] + [six.ensure_text(line) for line in lines])
