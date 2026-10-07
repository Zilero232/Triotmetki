from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ..compat import to_text
from .constants import DATE_TIME_FORMAT


# RU 1.45 client/game.py sets LC_TIME, where Windows' Russian locales give `%p` no text.
def format_moment(time_format, moment):
    """`time.strftime` as text; '' for an empty format (a switched-off clock or date)."""
    if not time_format:
        return u''
    time_format = to_text(time_format).replace(u'%p', u'AM' if moment.tm_hour < 12 else u'PM')
    return to_text(time.strftime(str(time_format), moment))


def format_epoch(epoch, time_format=DATE_TIME_FORMAT):
    """Epoch seconds on the local clock (`dd.mm.YYYY HH:MM` by default), or None."""
    if epoch is None:
        return None
    return format_moment(time_format, time.localtime(epoch))


def format_timer(seconds):
    """`mm:ss` of a countdown; '' when there is none."""
    if seconds is None:
        return u''
    minutes, rest = divmod(int(seconds), 60)
    return u'%02d:%02d' % (minutes, rest)
