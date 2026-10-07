# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'hangar_battle_results'
SECTION = 'battle_results'
MAX_TEMPLATE = 1000
BONUS_RANDOM = 'random'
BONUS_ALL = 'all'
BONUS_TYPES = (BONUS_RANDOM, BONUS_ALL)

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

LAST_SWITCH = 'battle_last_results'
LAST_PANEL_ID = 'last_battle'
LAST_DEFAULTS = {'x': -8, 'y': -322, 'align_x': 'right', 'align_y': 'bottom'}
LAST_RETIRED_PLACES = ((372, 60, 'left', 'top'),)
