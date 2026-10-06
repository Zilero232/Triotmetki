from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'hangar_info'
SECTION = 'hangar_info'
GROUP = 'hangar'
MAX_TEMPLATE = 300

CLOCK_FORMATS = ('%H:%M', '%H:%M:%S', '%I:%M %p')
DATE_FORMATS = ('', '%d.%m', '%d.%m.%Y', '%Y-%m-%d')
ALIGN_X = ('left', 'center', 'right')
ALIGN_Y = ('top', 'center', 'bottom')

# Battle Observer's hangar clock (res/gui/gameface/.../hangar/clock/clock.css: left 2.6vw, top 83px): top left, under
# the hangar's header; 2.6 % of a 1920 px wide screen is 50 px.
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

# The type size follows the design scale.
FIXED = {'font_size': 14}
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
