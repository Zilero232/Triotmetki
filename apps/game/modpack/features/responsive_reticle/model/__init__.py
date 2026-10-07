from __future__ import absolute_import, division, print_function, unicode_literals

import inspect
import math

from ....core.compat import fraction, is_number
from .constants import (
    ANGLE_EPS,
    FOLLOW_SMOOTH,
    INSTANT_RELAX_S,
    MAX_FRAME_DIFF_S,
    MIN_FRAME_DIFF_S,
    ROTATE_ARGUMENTS,
    SERVER_TICK_S,
    SKIP_ARTILLERY,
    SKIP_FIXED_YAW,
    SKIP_REPLAY,
    SMOOTH_RELAX_S,
    SPG_TAG,
    STILL_EPS,
)

# Fair play: only the own marker is drawn more often; aim, dispersion and shot stay at the server tick.


def argument_names(function):
    try:
        names = inspect.getargspec(function).args
    except TypeError:
        return ()
    return tuple(names[1:])


def supports_rotate(names):
    return tuple(names) == ROTATE_ARGUMENTS


def skip_reason(is_replay, class_tags, static_yaw):
    if is_replay:
        return SKIP_REPLAY
    if SPG_TAG in (class_tags or ()):
        return SKIP_ARTILLERY
    if static_yaw is not None:
        return SKIP_FIXED_YAW
    return None


def server_tick(now):
    if not is_number(now):
        return None
    return int(math.floor(now / SERVER_TICK_S))


def frame_time_diff(now, last):
    if not is_number(now) or not is_number(last):
        return None
    diff = now - last
    if diff < MIN_FRAME_DIFF_S:
        return None
    return min(diff, MAX_FRAME_DIFF_S)


def relax_time(follow, time_diff):
    if follow == FOLLOW_SMOOTH:
        return max(SMOOTH_RELAX_S, time_diff)
    return INSTANT_RELAX_S


def turn_time(follow, time_diff):
    return max(time_diff, relax_time(follow, time_diff))


def nearly_same(first, second, eps=STILL_EPS):
    if first is None or second is None or len(first) != len(second):
        return False
    return all(abs(a - b) <= eps for a, b in zip(first, second))


def turned(before, after):
    return not nearly_same(before, after, ANGLE_EPS)


def blend(start, target, progress):
    if start is None or not isinstance(target, (list, tuple)) or len(start) != len(target):
        return target
    share = fraction(progress)
    return [a + (b - a) * share for a, b in zip(start, target)]


class TickBlend(object):

    def __init__(self):
        self.clear()

    def clear(self):
        self.tick = None
        self.started = None
        self.start = None
        self.target = None
        self.last = None

    def get(self, now, compute):
        tick = server_tick(now)
        if tick is None:
            return compute()
        if tick != self.tick:
            self.start = self.last if self.tick is not None and tick - self.tick == 1 else None
            self.target = compute()
            self.tick = tick
            self.started = now
        self.last = blend(self.start, self.target, (now - self.started) / SERVER_TICK_S)
        return self.last


class Stillness(object):

    def __init__(self):
        self.clear()

    def clear(self):
        self.key = None
        self.settled = False
        self.idle = False

    def still(self, key):
        self.idle = self.settled and nearly_same(key, self.key)
        self.key = key
        return self.idle

    def turned(self, moved):
        self.settled = not moved


class TickGate(object):
    def __init__(self):
        self.ticks = {}

    def allow(self, key, tick):
        if tick is None:
            return True
        if self.ticks.get(key) == tick:
            return False
        self.ticks[key] = tick
        return True

    def clear(self):
        self.ticks.clear()
