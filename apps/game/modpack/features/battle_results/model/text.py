from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import format_percent, format_signed
from .constants import UNKNOWN_RESULT


def result_label(result, translate):
    return translate('br_result_' + (result or UNKNOWN_RESULT))


def percent_text(value):
    if value is None:
        return ''
    return format_percent(value)


def signed(value, percent=False):
    return format_signed(value, percent, '')
