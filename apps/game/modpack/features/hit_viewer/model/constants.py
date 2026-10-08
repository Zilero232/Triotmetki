# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import re

BOOK_FILE = 'hit_viewer_%d.json'
MAX_HITS = 160
MAX_SEGMENTS = 8

# The own team's result, set from the battle results that arrive after the battle.
RESULT_WIN = 'win'
RESULT_LOSS = 'loss'
RESULT_DRAW = 'draw'
RESULTS = (RESULT_WIN, RESULT_LOSS, RESULT_DRAW)
MAX_TIER = 11
# The client's small map picture (the replay manager shows the same), by the arena's geometry name.
MAP_ICON = 'gui/maps/icons/map/small/%s.png'
MAP_NAME = re.compile(r'^[0-9a-z_]{1,64}\Z')

SIDE_RECEIVED = 'received'
SIDE_DEALT = 'dealt'
SIDES = (SIDE_RECEIVED, SIDE_DEALT)
OWN_TARGET = 'own'
MODULE_KEYS = ('chassis', 'turret', 'gun')
ANALYSIS_KEYS = ('angle', 'armor', 'nominal')
# Vehicle.getAimParams() of the hit vehicle (turret yaw, gun pitch in radians), the pose the hangar model takes back.
AIM_LIMIT = 7.0

# VehicleEffects.DamageFromShotDecoder.decodeSegment widens a decoded segment by this share of its length at both ends.
SEGMENT_MARGIN = 0.01

# A plate hit at a grazing angle: the cosine is kept above this so the effective armour stays finite.
MIN_COS = 0.05
# The shell codes of the book (core.shells) as the client's shell kinds, for core.armor's normalisation: AP 5 degrees,
# APCR (APFSDS among them) 2, widened past two calibres; HEAT and HE are not normalised.
SHELL_KINDS = {'ap': 'ARMOR_PIERCING', 'apcr': 'ARMOR_PIERCING_CR', 'heat': 'HOLLOW_CHARGE', 'he': 'HIGH_EXPLOSIVE'}

# poliroid BattleHits (MIT, gui/battlehits/_constants.py MODEL_PATHS): its shell and hit-effect models, shipped
# unmodified at their own in-game paths (assets/third_party/battlehits). The HE model is its `hemodern`.
SHELL_MODELS = {
    'ap': 'content/battlehits/common/shells/ap/shell.model',
    'apcr': 'content/battlehits/common/shells/apcr/shell.model',
    'heat': 'content/battlehits/common/shells/heat/shell.model',
    'he': 'content/battlehits/common/shells/hemodern/shell.model',
}
EFFECT_MODEL = 'content/battlehits/style1/effects/%s/effect.model'
# BattleHits HangarScene.__updateEffect: a ricochet, a block, a penetration (also a critical hit with damage) and a
# hit without damage each have their marker.
EFFECT_BY_OUTCOME = {
    'ricochet': 'ricochet',
    'blocked': 'notpenetration',
    'pen': 'penetration',
    'crit': 'critical',
    'nodamage': 'critical',
}
DAMAGED_EFFECT = 'penetration'

DASH = u'—'
SEPARATOR = u' · '

COMMAND_READY = 'ready'
COMMAND_CLOSE = 'close'
COMMAND_BATTLE = 'battle'
COMMAND_TAB = 'tab'
COMMAND_SELECT = 'select'
COMMAND_MOVE = 'move'
COMMAND_DIAG = 'diag'
COMMANDS = {
    COMMAND_READY: (),
    COMMAND_CLOSE: (),
    COMMAND_BATTLE: ('id',),
    COMMAND_TAB: ('tab',),
    COMMAND_SELECT: ('index',),
    COMMAND_MOVE: ('dx', 'dy', 'dz'),
    COMMAND_DIAG: ('text',),
}
TEXT_FIELDS = {COMMAND_BATTLE: 'id', COMMAND_DIAG: 'text'}
MAX_MESSAGE_CHARS = 2048

# The page's own strings: (state key, i18n key).
PAGE_LABELS = (
    ('title', 'hv_title'),
    ('close', 'hv_close'),
    ('battles', 'hv_battles'),
    ('number', 'hv_col_number'),
    ('vehicle', 'hv_col_vehicle'),
    ('result', 'hv_col_result'),
    ('shell', 'hv_col_shell'),
    ('damage', 'hv_col_damage'),
    ('angle', 'hv_col_angle'),
    ('armor', 'hv_col_armor'),
    ('empty', 'hv_empty'),
    ('no_battles', 'hv_no_battles'),
    ('no_battles_title', 'hv_no_battles_title'),
    ('loading', 'hv_loading'),
    ('hint', 'hv_hint'),
    ('approx', 'hv_approx'),
    ('details', 'hv_details'),
    ('nominal', 'hv_nominal'),
    ('effective', 'hv_effective'),
    ('no_angle', 'hv_no_angle'),
    ('win', 'hv_battle_win'),
    ('loss', 'hv_battle_loss'),
    ('draw', 'hv_battle_draw'),
    ('part', 'hv_col_part'),
    ('pick_battle', 'hv_pick_battle'),
    ('zone', 'hv_col_zone'),
    ('filter', 'hv_filter'),
    ('filter_all', 'hv_filter_all'),
    ('profile', 'hv_profile'),
    ('profile_pens', 'hv_profile_pens'),
    ('profile_weak', 'hv_profile_weak'),
    ('profile_few', 'hv_profile_few'),
    ('profile_note', 'hv_profile_note'),
    ('profile_show', 'hv_profile_show'),
    ('profile_hide', 'hv_profile_hide'),
)

NO_AIM = (0.0, 0.0)

ACTION_OPEN = 'open'
ACTION_CLEAR = 'clear'

# Zones from the hit point's fractions of its part's box (+z front, +y up): a rough split, not a given tank's plates.
ZONE_HULL_UPPER = 'hull_upper'
ZONE_HULL_LOWER = 'hull_lower'
ZONE_HULL_SIDE = 'hull_side'
ZONE_HULL_REAR = 'hull_rear'
ZONE_TURRET_FRONT = 'turret_front'
ZONE_TURRET_SIDE = 'turret_side'
ZONE_TURRET_REAR = 'turret_rear'
ZONE_CHASSIS = 'chassis'
ZONE_GUN = 'gun'
ZONES = (
    ZONE_HULL_UPPER,
    ZONE_HULL_LOWER,
    ZONE_HULL_SIDE,
    ZONE_HULL_REAR,
    ZONE_TURRET_FRONT,
    ZONE_TURRET_SIDE,
    ZONE_TURRET_REAR,
    ZONE_GUN,
    ZONE_CHASSIS,
)
# (rear below, front above) along z; the hull front splits into its upper and lower plate at HULL_UPPER_FROM.
ZONE_BANDS = {'hull': (0.22, 0.75), 'turret': (0.3, 0.6)}
HULL_UPPER_FROM = 0.5

# A weak zone is named only past this many hits on the own tank and penetrations in the zone.
PROFILE_MIN_HITS = 5
WEAK_MIN_PENS = 2
