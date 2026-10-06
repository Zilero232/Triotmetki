from __future__ import absolute_import, division, print_function, unicode_literals

import bisect

from ....core.compat import is_number
from ....core.format import TIER_COLORS, format_number
from .constants import EVEN_WIN_RATE, WN8_BOUNDS, WN8_SCALE


def wn8_tier(value):
    if not is_number(value):
        return None
    index = bisect.bisect_right(WN8_BOUNDS, value) - 1
    return WN8_SCALE[max(index, 0)][1]


def tier_color(tier):
    return TIER_COLORS.get(tier)


def win_rate_tone(value):
    if not is_number(value):
        return 'muted'
    return 'good' if value >= EVEN_WIN_RATE else 'bad'


def rating_value(rating):
    if not isinstance(rating, dict) or rating.get('value') is None:
        return None
    return format_number(rating['value'])
