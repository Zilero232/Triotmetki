from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'battle_progress'
PANEL_ID = 'battle_progress'
GROUP = 'battle'

DEFAULTS = {
    'x': 423,
    'y': 4,
    'align_x': 'center',
    'align_y': 'top',
    'row_main_gun': True,
    'row_wn8': True,
    'main_gun_share': False,
}
FIXED = {'colored': True}
ADVANCED = ('main_gun_share',)
RETIRED_PLACES = ((-372, 60, 'right', 'top'),)
