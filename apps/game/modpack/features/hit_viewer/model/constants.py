# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

BOOK_FILE = 'hit_viewer_%d.json'
BOOK_VERSION = 1
MAX_BATTLES = 30
MAX_HITS = 160
MAX_SEGMENTS = 8
# The own feedback's damage and the hit's points arrive close together, in either order.
DAMAGE_WINDOW_S = 1.0

SIDE_RECEIVED = 'received'
SIDE_DEALT = 'dealt'
SIDES = (SIDE_RECEIVED, SIDE_DEALT)
OWN_TARGET = 'own'
MODULE_KEYS = ('chassis', 'turret', 'gun')
ANALYSIS_KEYS = ('angle', 'armor', 'nominal')

# RU 1.45 client source (vehicle_systems/tankStructure.TankPartIndexes): 0 chassis, 1 hull, 2 turret, 3 gun; higher
# indices are the chassis' track pairs and wheels (VehicleEffects.DamageFromShotDecoder.convertComponentIndex).
PART_NAMES = ('chassis', 'hull', 'turret', 'gun')
# RU 1.45 common/constants.VEHICLE_HIT_EFFECT: 0 pierced without damage, 1-2 ricochets, 3 not pierced, 4 pierced,
# 5 critical hit, 6 pierced with a damaged device.
OUTCOME_BY_CODE = {0: 'nodamage', 1: 'ricochet', 2: 'ricochet', 3: 'blocked', 4: 'pen', 5: 'crit', 6: 'crit'}
OUTCOMES = ('pen', 'crit', 'blocked', 'ricochet', 'nodamage')
DAMAGING = ('pen', 'crit')

# A plate hit at a grazing angle: the cosine is kept above this so the effective armour stays finite.
MIN_COS = 0.05
DASH = u'—'
SEPARATOR = u' · '

# What the page asks (protocol.decode_message): the command and the fields it needs.
COMMANDS = {
    'ready': (),
    'close': (),
    'battle': ('id',),
    'tab': ('tab',),
    'select': ('index',),
}
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
    ('loading', 'hv_loading'),
    ('hint', 'hv_hint'),
    ('approx', 'hv_approx'),
)

ACTION_OPEN = 'open'
ACTION_CLEAR = 'clear'
