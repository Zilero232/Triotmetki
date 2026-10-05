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
    'battle_clock': True,
    'replace_timer': False,
    'template': '',
    'x': 50,
    'y': 83,
    'align_x': 'left',
    'align_y': 'top',
    'scale': 100,
}

# The battle clock follows the hangar clock's format; the type size follows the design scale.
FIXED = {'font_size': 14}
ADVANCED = ('replace_timer', 'template')

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

# The battle clock is a HUD panel of its own (its place in the `battle_clock` section, the id it had as a component of
# its own): left of the stock timer (battleTimer, 184 x 44 at the top right) on its line, clear of the right team list
# that starts under the timer and of the score strip in the middle (tools/tests/test_battle_layout.py).
CLOCK_PANEL_ID = 'battle_clock'
CLOCK_DEFAULTS = {
    'x': -190,
    'y': 4,
    'align_x': 'right',
    'align_y': 'top',
}
# The default places of older versions (x, y, align_x, align_y): a panel still at one moves to today's default.
CLOCK_RETIRED_PLACES = (
    (-128, 4, 'right', 'top'),
    (-20, 8, 'right', 'top'),
    (-8, 44, 'right', 'top'),
    (-8, 46, 'right', 'top'),
)
