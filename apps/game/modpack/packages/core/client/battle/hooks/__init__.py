"""Subscriptions to battle-session events that may not exist yet when the avatar becomes ready."""
from __future__ import absolute_import, division, print_function, unicode_literals

import functools

import BigWorld

from ....hooks import subscribe, unsubscribe
from ....log import log, log_exception, safe
from .constants import ATTEMPTS, RETRY_S


class BattleHooks(object):
    """`add(resolve, name, handler)` subscribes `handler` to `resolve().name`, retrying every RETRY_S up
    to ATTEMPTS times while `resolve()` returns None; `on_result(name, attached)`, when given, hears whether it
    attached, and a subscription that never attaches is logged. `clear()` (on battle_leave) removes every
    subscription and cancels the pending retries."""

    def __init__(self, retry_s=RETRY_S, attempts=ATTEMPTS):
        self.retry_s = retry_s
        self.attempts = attempts
        self.items = []
        self.generation = 0

    def add(self, resolve, name, handler, on_result=None):
        self._try(self.generation, resolve, name, handler, 0, on_result)

    def _try(self, generation, resolve, name, handler, attempt, on_result):
        if generation != self.generation:
            return
        try:
            attached = self._attach(resolve(), name, handler)
        except Exception:
            log_exception('hook %s' % name)
            self._report(on_result, name, False)
            return

        if attached:
            self._report(on_result, name, True)
            return
        if attempt + 1 < self.attempts:
            retry = functools.partial(self._try, generation, resolve, name, handler, attempt + 1, on_result)
            BigWorld.callback(self.retry_s, safe(retry))
            return
        log('battle hook %s: no owner after %d tries' % (name, self.attempts))
        self._report(on_result, name, False)

    def _attach(self, owner, name, handler):
        if owner is None:
            return False
        self.items.append((owner, name, subscribe(owner, name, handler)))
        return True

    @staticmethod
    def _report(on_result, name, attached):
        if on_result is not None:
            safe(on_result)(name, attached)

    def clear(self):
        self.generation += 1
        while self.items:
            owner, name, handler = self.items.pop()
            unsubscribe(owner, name, handler)
