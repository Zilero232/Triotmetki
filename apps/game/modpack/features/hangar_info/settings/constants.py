from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import CARD_FIXED

SWITCH = 'hangar_info'
SECTION = 'hangar_info'
GROUP = 'hangar'
MAX_TEMPLATE = 300

CLOCK_FORMATS = ('%H:%M', '%H:%M:%S', '%I:%M %p')
DATE_FORMATS = ('', '%d.%m', '%d.%m.%Y', '%Y-%m-%d')
ALIGN_X = ('left', 'center', 'right')
ALIGN_Y = ('top', 'center', 'bottom')

DEFAULTS = {
    'clock_format': '%H:%M',
    'date_format': '%d.%m',
    'show_server': True,
    'show_ping': True,
    'show_online': True,
    'template': '',
    'x': 50,
    'y': 83,
    'align_x': 'left',
    'align_y': 'top',
    'scale': 100,
}

FIXED = CARD_FIXED
ADVANCED = ('template',)

CHOICES = {
    'clock_format': CLOCK_FORMATS,
    'date_format': DATE_FORMATS,
    'align_x': ALIGN_X,
    'align_y': ALIGN_Y,
}

LIMITS = {
    'x': (-4000, 4000),
    'y': (-4000, 4000),
    'scale': (50, 300),
}
