from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from .constants import EXACT_SCALE_RANGE, PERCENT, SCALE_TOLERANCE


def exact_scale(percent):
    """The interface scale for the setting `interface_scale_exact` (130 -> 1.3), or None when it is off (0 or under the
    lowest step)."""
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
