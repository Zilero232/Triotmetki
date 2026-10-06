# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import re

BOOK_FILE = 'hit_viewer_%d.json'
BOOK_VERSION = 1
MAX_BATTLES = 30
MAX_HITS = 160
MAX_SEGMENTS = 8
# The own feedback's damage and the hit's points arrive close together, in either order.
DAMAGE_WINDOW_S = 1.0

# The own team's result, set from the battle results that arrive after the battle.
RESULT_WIN = 'win'
RESULT_LOSS = 'loss'
RESULT_DRAW = 'draw'
RESULTS = (RESULT_WIN, RESULT_LOSS, RESULT_DRAW)
MAX_TIER = 11
# The client's small map picture (the replay manager shows the same), by the arena's geometry name.
MAP_ICON = 'gui/maps/icons/map/small/%s.png'
MAP_NAME = re.compile(r'^[0-9a-z_]{1,64}$')

SIDE_RECEIVED = 'received'
SIDE_DEALT = 'dealt'
SIDES = (SIDE_RECEIVED, SIDE_DEALT)
OWN_TARGET = 'own'
MODULE_KEYS = ('chassis', 'turret', 'gun')
ANALYSIS_KEYS = ('angle', 'armor', 'nominal')
# Vehicle.getAimParams() of the hit vehicle (turret yaw, gun pitch in radians), the pose the hangar model takes back.
AIM_LIMIT = 7.0

# RU 1.45 client source (vehicle_systems/tankStructure.TankPartIndexes): 0 chassis, 1 hull, 2 turret, 3 gun; higher
# indices are the chassis' track pairs and wheels (VehicleEffects.DamageFromShotDecoder.convertComponentIndex).
PART_NAMES = ('chassis', 'hull', 'turret', 'gun')
# VehicleEffects.DamageFromShotDecoder.decodeSegment widens a decoded segment by this share of its length at both ends.
SEGMENT_MARGIN = 0.01
# RU 1.45 common/constants.VEHICLE_HIT_EFFECT: 0 pierced without damage, 1-2 ricochets, 3 not pierced, 4 pierced,
# 5 critical hit, 6 pierced with a damaged device.
OUTCOME_BY_CODE = {0: 'nodamage', 1: 'ricochet', 2: 'ricochet', 3: 'blocked', 4: 'pen', 5: 'crit', 6: 'crit'}
OUTCOMES = ('pen', 'crit', 'blocked', 'ricochet', 'nodamage')
DAMAGING = ('pen', 'crit')

# A plate hit at a grazing angle: the cosine is kept above this so the effective armour stays finite.
MIN_COS = 0.05
# The shell turns towards the plate's normal by this many degrees before it meets the armour. The client never reads
# the value (RU 1.45 items/vehicles._readShell skips normalizationAngle on IS_CLIENT): these are the game's standard
# AP and APCR values; HEAT and HE are not normalised.
NORMALIZATION_DEG = {'ap': 5.0, 'apcr': 2.0}
# Over-match: a calibre over twice the plate widens the normalisation by 1.4 * calibre / (2 * armour).
OVERMATCH_RATIO = 2.0
OVERMATCH_FACTOR = 1.4

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

# What the page asks (protocol.decode_message): the command and the fields it needs.
COMMANDS = {
    'ready': (),
    'close': (),
    'battle': ('id',),
    'tab': ('tab',),
    'select': ('index',),
    'move': ('dx', 'dy', 'dz'),
    'diag': ('text',),
}
# A camera drag or wheel step from the page, in screen pixels and wheel units (RU 1.45 maps_training_base_view
# ._onMoveSpace passes the same dx, dy, dz on); anything larger is clamped.
MAX_MOVE = 2000
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
)

ACTION_OPEN = 'open'
ACTION_CLEAR = 'clear'
