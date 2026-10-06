from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from .constants import EXACT_SCALE_RANGE, PERCENT, SCALE_TOLERANCE


def exact_scale(percent):
    if not is_number(percent):
        return None
    low, high = EXACT_SCALE_RANGE
    if percent < low:
        return None
    return min(high, percent) / PERCENT


def needs_scale(current, wanted):
    if wanted is None:
        return False
    if not is_number(current):
        return True
    return abs(current - wanted) > SCALE_TOLERANCE
