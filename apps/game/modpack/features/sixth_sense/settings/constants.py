from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_DOWN, COLOR_UP, COLOR_WARN

SWITCH = 'battle_sixth_sense'
PANEL_ID = 'sixth_sense'
MAX_TEXT = 120
ICON_SETS = ('lamp', 'eye', 'badge', 'marks')
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
FIXED = {
    'icon': '',
    'icon_size': 56,
    'hide_after_s': 0,
}
ADVANCED = ('text', 'replace_stock')
RETIRED_PLACES = (
    (0, 170, 'center', 'top'),
)

CHOICES = {'icon_set': ICON_SETS, 'color': COLORS}
