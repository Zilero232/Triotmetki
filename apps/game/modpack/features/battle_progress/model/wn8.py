from __future__ import absolute_import, division, print_function, unicode_literals

import bisect

from ....core.compat import clamp, is_number
from .constants import (
    DAMAGE_FLOOR,
    DEF_FLOOR,
    DEF_MARGIN,
    FRAG_FLOOR,
    FRAG_MARGIN,
    NEUTRAL_WIN_RATIO,
    SPOT_FLOOR,
    SPOT_MARGIN,
    WEIGHT_DAMAGE,
    WEIGHT_DAMAGE_FRAG,
    WEIGHT_DEF_FRAG,
    WEIGHT_FRAG_SPOT,
    WEIGHT_WIN,
    WIN_CAP,
    WIN_FLOOR,
    WN8_SCALE,
)

# Fair play: this battle's own damage, spotting, frags and capture points reset (the player's feedback events) against
# the tank's expected values and the player's own WN8 on it from the site.


def _ratio(value, expected):
    if not is_number(expected) or expected <= 0:
        return 0.0
    return float(value) / expected


def _cut(ratio, floor):
    return max(0.0, (ratio - floor) / (1 - floor))


def _capped(value, expected, floor, cap):
    return clamp(_cut(_ratio(value, expected), floor), 0.0, cap)


def wn8(counts, expected, win_ratio=NEUTRAL_WIN_RATIO):
    if not expected:
        return None
    damage = _cut(_ratio(counts['damage'], expected.get('damage')), DAMAGE_FLOOR)
    frag = _capped(counts['frags'], expected.get('frag'), FRAG_FLOOR, damage + FRAG_MARGIN)
    spot = _capped(counts['spot'], expected.get('spot'), SPOT_FLOOR, damage + SPOT_MARGIN)
    defence = _capped(counts['def'], expected.get('def'), DEF_FLOOR, damage + DEF_MARGIN)
    win = min(WIN_CAP, _cut(win_ratio, WIN_FLOOR))

    score = (
        WEIGHT_DAMAGE * damage
        + WEIGHT_DAMAGE_FRAG * damage * frag
        + WEIGHT_FRAG_SPOT * frag * spot
        + WEIGHT_DEF_FRAG * defence * frag
        + WEIGHT_WIN * win
    )
    return int(round(score))


def rating_color(value):
    bounds = [bound for bound, _ in WN8_SCALE]
    return WN8_SCALE[max(0, bisect.bisect_right(bounds, value) - 1)][1]


def wn8_state(counts, row):
    row = row or {}
    value = wn8(counts, row.get('expected'))
    if value is None:
        return None
    return {'wn8': value, 'tank_wn8': (row.get('wn8') or {}).get('value')}
