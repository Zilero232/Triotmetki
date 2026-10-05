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

# The previous battle's card: its switch stays in config.json beside the component's own, its place in its own panel
# section. Right aligned 8 px from the right edge and 12 px above the minimap, where the packs show the results notice
# (docs/research/competitors/2026-10-05-behavior-parity.md section 1.2): the page follows the player's minimap size
# (core/hud/panel ATTACHED minimap_above); this place is the one for the middle size (310 px).
LAST_SWITCH = 'battle_last_results'
LAST_PANEL_ID = 'last_battle'
LAST_DEFAULTS = {'x': -8, 'y': -322, 'align_x': 'right', 'align_y': 'bottom'}
# The default places of older versions (x, y, align_x, align_y): a card still at one moves to today's default.
LAST_RETIRED_PLACES = ((372, 60, 'left', 'top'),)
