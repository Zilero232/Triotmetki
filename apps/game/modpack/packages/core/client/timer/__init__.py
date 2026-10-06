from __future__ import absolute_import, division, print_function, unicode_literals

import functools

import BigWorld

from ...log import log, log_exception
from .constants import MAX_FAILURES


def game_time():
    """BigWorld.time(): the client's game clock in seconds, or None without it."""
    getter = getattr(BigWorld, 'time', None)
    return getter() if getter is not None else None


class Ticker(object):
    """Calls `on_tick()` every `interval_s` through BigWorld.callback from `start()` until `stop()`, or until
    `on_tick` returns False. A failing tick is logged and the ticking goes on, up to MAX_FAILURES in a row (then it
    stops with one line); `stop()` cancels the pending callback, and a stop followed by a start never leaves two chains
    running. `elapsed()` inside `on_tick` is the game time since the previous tick (or
    the start or `restart_elapsed()`): a callback fires on the first frame after its delay, so counting
    `interval_s` per tick drifts."""

    def __init__(self, interval_s, on_tick):
        self.interval_s = interval_s
        self.on_tick = on_tick
        self.running = False
        self.generation = 0
        self.last_at = None
        self.last_elapsed = interval_s
        self.failures = 0
        self.callback = None
        self.callback_id = None

    def start(self):
        if self.running:
            return
        self.running = True
        self.generation += 1
        self.failures = 0
        self.last_at = game_time()
        self.callback = functools.partial(self._tick, self.generation)
        self._schedule()

    def stop(self):
        self.running = False
        self._cancel()

    def _cancel(self):
        callback_id = self.callback_id
        self.callback_id = None
        cancel = getattr(BigWorld, 'cancelCallback', None)
        if callback_id is None or cancel is None:
            return
        try:
            cancel(callback_id)
        except Exception:
            return

    def elapsed(self):
        return self.last_elapsed

    def restart_elapsed(self):
        """The next `elapsed()` counts from now: call it when a countdown was just set from the client."""
        self.last_at = game_time()

    def _schedule(self):
        self.callback_id = BigWorld.callback(self.interval_s, self.callback)

    def _measure(self):
        now = game_time()
        if now is None or self.last_at is None or now < self.last_at:
            self.last_elapsed = self.interval_s
        else:
            self.last_elapsed = now - self.last_at
        self.last_at = now

    def _tick(self, generation):
        self.callback_id = None
        if not self.running or generation != self.generation:
            return
        keep = self._run()
        if keep is False:
            self.running = False
            return
        self._schedule()

    def _run(self):
        try:
            self._measure()
            keep = self.on_tick()
        except Exception:
            log_exception('tick')
            return self._failed()
        self.failures = 0
        return keep

    def _failed(self):
        self.failures += 1
        if self.failures < MAX_FAILURES:
            return True
        log('tick %s failed %d times in a row, stopped' % (getattr(self.on_tick, '__name__', '?'), self.failures))
        return False
