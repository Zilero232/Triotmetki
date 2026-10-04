from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_DOWN, COLOR_UP, COLOR_WARN

SWITCH = 'battle_sixth_sense'
PANEL_ID = 'sixth_sense'
MAX_TEXT = 120
ICON_SETS = ('lamp', 'eye', 'badge', 'marks')
# The caption and timer tones the window offers as swatches: the warning amber first (the default), then white, the
# up and down tones of the HUD, a cyan and a violet.
COLORS = (COLOR_WARN, '#FFFFFF', COLOR_UP, COLOR_DOWN, '#40C8FF', '#B48CFF')

DEFAULTS = {
    'x': -66,
    'y': -182,
    'align_x': 'center',
    'align_y': 'center',
    'font_size': 22,
    'text': '',
    'color': COLOR_WARN,
    'icon_set': 'lamp',
    'pulse': True,
    'show_timer': True,
    'replace_stock': True,
}
# Retired options and the values the code keeps reading: the icon size of the default panel, the lamp as long as the
# stock one stays lit, no own picture (the shipped icon sets only).
FIXED = {
    'icon': '',
    'icon_size': 56,
    'hide_after_s': 0,
}
ADVANCED = ('text', 'replace_stock')
# The default places of older versions (x, y, align_x, align_y): a panel still at one moves to today's default.
RETIRED_PLACES = (
    (0, 170, 'center', 'top'),
)

CHOICES = {'icon_set': ICON_SETS, 'color': COLORS}
