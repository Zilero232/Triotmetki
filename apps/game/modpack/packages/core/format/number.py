from __future__ import absolute_import, division, print_function, unicode_literals

from ..compat import is_number
from .constants import MISSING


def format_number(value):
    """`12 345`: rounded, a space as the thousands separator; '-' when not a number."""
    if not is_number(value):
        return MISSING
    return u'{:,}'.format(int(round(value))).replace(u',', u' ')


def format_percent(value):
    if not is_number(value):
        return MISSING
    return u'%.2f%%' % value


def format_signed(value, percent=False, missing=MISSING):
    """`format_number` (or `format_percent`) with a plus before a positive value; `missing` when not a number."""
    if not is_number(value):
        return missing
    text = format_percent(value) if percent else format_number(value)
    return u'+' + text if value > 0 else text
