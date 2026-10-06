from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.compat import is_number
from .constants import (
    ANGLE_EPS,
    FOLLOW_SMOOTH,
    INSTANT_RELAX_S,
    LESTA_REALMS,
    MAX_FRAME_DIFF_S,
    MIN_FRAME_DIFF_S,
    REALM_LESTA,
    REALM_WG,
    ROTATE_ARGUMENTS,
    SERVER_TICK_S,
    SKIP_ARTILLERY,
    SKIP_FIXED_YAW,
    SKIP_REPLAY,
    SMOOTH_RELAX_S,
    SPG_TAG,
    STILL_EPS,
)

# Fair play: only the own gun marker is drawn more often, from the client's own prediction of the own gun. The aim sent
# to the server, the dispersion and the stock shot-result colour stay at the server tick; nothing is aimed, nothing
# about other vehicles is read, the shot is untouched.


def realm_of(current_realm):
    return REALM_LESTA if current_realm in LESTA_REALMS else REALM_WG


def argument_names(function):
    """The names of a function's (or an unbound method's) arguments after self."""
    function = getattr(function, '__func__', function)
    code = getattr(function, '__code__', None)
    if code is None:
        return ()
    return tuple(code.co_varnames[1:code.co_argcount])


def supports_rotate(names, realm):
    return tuple(names) == ROTATE_ARGUMENTS.get(realm)


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


# The stock rotator glides the own turret and gun models over a server tick to where it turned them. Turned every
# frame, they glide over the frame instead (or the smooth marker's relax), so the barrel keeps up with the marker.
def turn_time(follow, time_diff):
    return max(time_diff, relax_time(follow, time_diff))


def nearly_same(first, second, eps=STILL_EPS):
    if first is None or second is None or len(first) != len(second):
        return False
    return all(abs(a - b) <= eps for a, b in zip(first, second))


def turned(before, after):
    return not nearly_same(before, after, ANGLE_EPS)


def blend(start, target, fraction):
    if start is None or not isinstance(target, (list, tuple)) or len(start) != len(target):
        return target
    fraction = min(1.0, max(0.0, fraction))
    return [a + (b - a) * fraction for a, b in zip(start, target)]


# The dispersion is worked out once per server tick, as the stock tick does; the frames in between get the way from
# the value handed out last to the new one over the tick, the way the stock marker glides its size, so the circle
# shrinks smoothly instead of in ten steps a second. A tick that does not follow the last one starts at the new value.
class TickBlend(object):

    def __init__(self):
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

    def clear(self):
        self.__init__()


# A frame with nothing to do: the same aim as the last frame's (`key`, a flat tuple of numbers) while the last turn
# moved nothing. Such frames, and the stock ticks among them, are the stock rotator's again.
class Stillness(object):

    def __init__(self):
        self.key = None
        self.settled = False
        self.idle = False

    def still(self, key):
        self.idle = self.settled and nearly_same(key, self.key)
        self.key = key
        return self.idle

    def turned(self, moved):
        self.settled = not moved

    def clear(self):
        self.__init__()


class TickGate(object):
    """Lets the first call of each key through once per server tick."""

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
