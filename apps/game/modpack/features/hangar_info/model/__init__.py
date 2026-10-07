from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.compat import to_text
from ....core.format import COLOR_MUTED, COLOR_NEUTRAL, font, format_moment
from ....core.templates import render
from .constants import CLOCK_SIZE_STEP, DETAIL_SEPARATOR
from .ping import ping_color, valid_ping
from .site import armor_actions, tank_slug  # noqa: F401
from .widget import strip_widget


def macro_values(info, settings, translate, now):
    return moment_values(info, settings, translate, time.localtime(now))


def moment_values(info, settings, translate, moment):
    ping = valid_ping(info.get('ping'))
    return {
        'time': format_moment(settings.get('clock_format'), moment),
        'date': format_moment(settings.get('date_format'), moment),
        'server': to_text(info.get('server') or ''),
        'ping': '' if ping is None else translate('hangar_info_ms', ping=ping),
        'online': to_text(info.get('online') or ''),
        'region_online': to_text(info.get('region_online') or ''),
    }


def _clock_line(values, size):
    head = values['time']
    if values['date']:
        head = '%s  %s' % (values['time'], values['date'])
    return font(head, COLOR_NEUTRAL, size + CLOCK_SIZE_STEP)


def _server_line(info, values, settings, translate):
    size = settings.get('font_size')
    details = []
    if settings.get('show_server') and values['server']:
        details.append(font(values['server'], COLOR_NEUTRAL, size))
    if settings.get('show_ping') and values['ping']:
        details.append(font(values['ping'], ping_color(valid_ping(info.get('ping'))), size))
    if settings.get('show_online') and values['online']:
        details.append(font(translate('hangar_info_online', online=values['online']), COLOR_MUTED, size))
    return DETAIL_SEPARATOR.join(details)


def format_info(info, settings, translate, now):
    values = macro_values(info, settings, translate, now)
    if settings.get('template'):
        return render(settings.get('template'), values)

    lines = [
        _clock_line(values, settings.get('font_size')),
        _server_line(info, values, settings, translate),
    ]
    return '\n'.join(line for line in lines if line)


def layout_of(settings):
    return {
        'x': settings.get('x'),
        'y': settings.get('y'),
        'alignX': settings.get('align_x'),
        'alignY': settings.get('align_y'),
        'scale': round(settings.get('scale') / 100, 2),
    }


def format_widget(info, settings, translate, now):
    if settings.get('template'):
        return None
    values = macro_values(info, settings, translate, now)
    return strip_widget(values, settings, valid_ping(info.get('ping')), translate)
