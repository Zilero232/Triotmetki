from __future__ import absolute_import, division, print_function, unicode_literals

import re

from ..stock.constants import CONSUMABLES_PANEL

ALIAS_PREFIX = 'otmetki.hud.'

PANEL_DEFAULTS = {
    'x': 0,
    'y': 0,
    'align_x': 'center',
    'align_y': 'top',
    'alpha': 100,
    'drag': True,
    'scale': 100,
}
PANEL_FIXED = {
    'font_size': 14,
    'border': False,
}

CARD_FIXED = {'font_size': 14}

PANEL_CHOICES = {
    'align_x': ('left', 'center', 'right'),
    'align_y': ('top', 'center', 'bottom'),
}

PANEL_LIMITS = {
    'x': (-4000, 4000),
    'y': (-4000, 4000),
    'alpha': (0, 100),
    'scale': (50, 300),
}

LAYOUT_KEYS = ('x', 'y', 'align_x', 'align_y', 'alpha', 'drag', 'border', 'scale')
PLACE_KEYS = ('x', 'y', 'align_x', 'align_y')
FIT_AXES = (('x', 'align_x', 'left', 'right'), ('y', 'align_y', 'top', 'bottom'))

HEX_COLOR = re.compile(r'^#[0-9A-Fa-f]{6}\Z')

MOVED_ALIGNS = (('alignX', 'align_x'), ('alignY', 'align_y'))

DOCK_ANCHORS = {
    # The stock damage log's place (BattlePage.as: x 229, the damage panel's top + 3).
    'battle_left_bottom': {'x': 232, 'y': -6, 'align_x': 'left', 'align_y': 'bottom', 'reserve': 560},
    'battle_left_top': {'x': 372, 'y': 60, 'align_x': 'left', 'align_y': 'top', 'reserve': 290, 'ceiling': 60},
    'hangar_left': {'x': 16, 'y': 440, 'align_x': 'left', 'align_y': 'top', 'reserve': 196},
    'hangar_right': {'x': -16, 'y': 570, 'align_x': 'right', 'align_y': 'top', 'reserve': 190},
}
DOCKS = {
    'otmetki.hud.damage_log': ('battle_left_bottom', 0),
    'otmetki.hud.platoon_points': ('battle_left_top', 0),
    'otmetki.hud.hangar_marks': ('hangar_left', 0),
    'otmetki.session': ('hangar_left', 1),
    'otmetki.crew_xp': ('hangar_left', 2),
    'otmetki.personal_missions': ('hangar_right', 0),
    'otmetki.comp7_helper': ('hangar_right', 1),
    'otmetki.event_trackers.triathlon': ('hangar_right', 2),
    'otmetki.event_trackers.caravan': ('hangar_right', 3),
}
ATTACH_KINDS = ('bar_right', 'bar_above', 'minimap_above', 'score_right')
ATTACHED = {
    'otmetki.hud.marks_panel': 'bar_right',
    'otmetki.hud.battle_loadout': 'bar_above',
    'otmetki.hud.last_battle': 'minimap_above',
    'otmetki.hud.battle_progress': 'score_right',
}
FOLLOWS = {
    'otmetki.hud.battle_loadout': CONSUMABLES_PANEL,
}
