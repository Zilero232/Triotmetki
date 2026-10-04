from __future__ import absolute_import, division, print_function, unicode_literals

from .....core.compat import is_number
from .....core.format import COLOR_MUTED, COLOR_NEUTRAL, font, format_moment, format_timer
from .constants import TIMED_PERIODS

# The clock under the stock battle timer. The battle timer itself shows only when it replaces the stock one: next to
# the stock timer it would show the same seconds twice.


def timer_seconds(period, period_end, server_now):
    if period not in TIMED_PERIODS:
        return None
    if not is_number(period_end) or not is_number(server_now) or period_end <= 0:
        return None
    # RU 1.45 client source: the stock battle timer shows max(int(end - BigWorld.serverTime()), 0), the seconds
    # truncated (gui/battle_control/controllers/period_ctrl.py ArenaPeriodController.__tick).
    return max(0, int(period_end - server_now))


def clock_values(moment, settings, seconds_left=None):
    timer = format_timer(seconds_left) if settings.get('replace_timer') else u''
    return {'time': format_moment(settings.get('clock_format'), moment), 'timer': timer}


def format_battle_clock(values, font_size):
    lines = [font(values['time'], COLOR_MUTED, font_size)]
    if values['timer']:
        lines.insert(0, font(values['timer'], COLOR_NEUTRAL, font_size))
    return u'\n'.join(lines)
