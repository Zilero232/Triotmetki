from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ..compat import to_text
from .constants import DATE_TIME_FORMAT


# The client sets LC_TIME from the system locale (RU 1.45 client/game.py), where Windows' Russian, Ukrainian and
# Belarusian locales give `%p` no text at all, so the 12-hour clock's AM/PM marker is written here.
def format_moment(fmt, moment):
    """`time.strftime` as text; '' for an empty format (a switched-off clock or date)."""
    if not fmt:
        return u''
    fmt = to_text(fmt).replace(u'%p', u'AM' if moment.tm_hour < 12 else u'PM')
    return to_text(time.strftime(str(fmt), moment))


def format_epoch(epoch, fmt=DATE_TIME_FORMAT):
    """Epoch seconds on the local clock (`dd.mm.YYYY HH:MM` by default), or None."""
    if epoch is None:
        return None
    return format_moment(fmt, time.localtime(epoch))


def format_timer(seconds):
    """`mm:ss` of a countdown; '' when there is none."""
    if seconds is None:
        return u''
    minutes, rest = divmod(int(seconds), 60)
    return u'%02d:%02d' % (minutes, rest)
