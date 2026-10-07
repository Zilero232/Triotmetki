from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'battle_platoon_points'
PANEL_ID = 'platoon_points'
GROUP = 'battle'

DEFAULTS = {
    'x': 372,
    'y': 60,
    'align_x': 'left',
    'align_y': 'top',
    'damage_step': 100,
    'assist_step': 200,
    'frag_points': 2,
    'alive_points': 1,
    'show_platoon': True,
    'show_solo': False,
}
RETIRED_PLACES = (
    (208, 8, 'left', 'top'),
    (260, 8, 'left', 'top'),
)
LIMITS = {'damage_step': (10, 1000), 'assist_step': (10, 2000), 'frag_points': (0, 20), 'alive_points': (0, 20)}
ADVANCED = ('damage_step', 'assist_step', 'frag_points', 'alive_points')
