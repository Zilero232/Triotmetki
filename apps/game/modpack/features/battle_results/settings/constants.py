# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'hangar_battle_results'
SECTION = 'battle_results'
MAX_TEMPLATE = 1000
BONUS_TYPES = ('random', 'all')

DEFAULTS = {
    'show_economy': True,
    'show_combat': True,
    'show_marks': True,
    'bonus_types': 'all',
    'template': '',
    'history_size': 30,
    'hits_tab': True,
    'hits_show_attacker': True,
}

LIMITS = {'history_size': (10, 100)}

FIXED = {'colored': True, 'hits_keep_battles': 10}
ADVANCED = ('hits_show_attacker', 'history_size', 'template')

# The two battle cards: their switches stay in config.json beside the component's own, each card's place in its own
# panel section.
SUMMARY_SWITCH = 'battle_summary'
LAST_SWITCH = 'battle_last_results'
SUMMARY_PANEL_ID = 'battle_summary'
LAST_PANEL_ID = 'last_battle'
# The right top column under «Прогресс боя» (core/hud/panel DOCKS battle_right_top) and the left top column under the
# marks and the platoon (battle_left_top): beside the team lists, never over the centre of the screen.
SUMMARY_DEFAULTS = {'x': -372, 'y': 60, 'align_x': 'right', 'align_y': 'top'}
LAST_DEFAULTS = {'x': 372, 'y': 60, 'align_x': 'left', 'align_y': 'top'}
