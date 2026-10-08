# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_DOWN, COLOR_MUTED, COLOR_NEUTRAL, COLOR_UP

# RU 1.45 client source: common/arena_achievements.py ACHIEVEMENT_CONDITIONS['mainGun'].
MIN_DAMAGE = 1000
MIN_SHARE_OF_ENEMY_HP = 0.2

PROGRESS = 'progress'
REACHED = 'reached'
UNREACHABLE = 'unreachable'
FAILED = 'failed'
# Battle Observer's main gun (MainGunUI.as) marks a medal out of reach; here the row goes instead.
HIDDEN_STATUSES = (UNREACHABLE, FAILED)
MAIN_GUN_LOOKS = {
    PROGRESS: {'value': 'bp_left', 'tone': 'text', 'bar': 'gold'},
    REACHED: {'value': 'bp_reached', 'tone': 'good', 'bar': 'good'},
}

# WN8 as wnefficiency.net defines it, the version the site computes.
WIN_FLOOR = 0.71
DAMAGE_FLOOR = 0.22
FRAG_FLOOR = 0.12
SPOT_FLOOR = 0.38
DEF_FLOOR = 0.10
FRAG_MARGIN = 0.2
SPOT_MARGIN = 0.1
DEF_MARGIN = 0.1
WIN_CAP = 1.8
WEIGHT_DAMAGE = 980
WEIGHT_DAMAGE_FRAG = 210
WEIGHT_FRAG_SPOT = 155
WEIGHT_DEF_FRAG = 75
WEIGHT_WIN = 145
NEUTRAL_WIN_RATIO = 1.0

# Mirrors @otmetki/ratings RATING_SCALES.wn8 and RATING_TIERS.
WN8_SCALE = (
    (0, '#E3564A'),
    (300, '#F08A3E'),
    (650, '#F2C94C'),
    (900, '#D9D9B8'),
    (1200, '#7CD35B'),
    (1600, '#4FC3B0'),
    (2000, '#5B9BF2'),
    (2450, '#A06CF0'),
    (2900, '#D75BD9'),
)

# RU 1.45 common/constants.py ARENA_GUI_TYPE RANDOM 1, EPIC_RANDOM 19, MAPBOX 24 award the medal.
MAIN_GUN_GUI_TYPES = (1, 19, 24)

COUNT_KEYS = ('damage', 'frags', 'spot', 'def')
KIND_BY_EVENT = (
    ('KILL', 'frags'),
    ('SPOTTED', 'spot'),
    ('BASE_CAPTURE_DROPPED', 'def'),
)
ANY_TARGET_KEYS = ('def',)

ROWS = ('main_gun', 'wn8')
# RU 1.45 gui-part1.pkg: the stock medal art the battle results show.
ROW_IMAGES = {'main_gun': 'gui/maps/icons/achievement/32x32/mainGun.png'}
ROW_GLYPHS = {'main_gun': 'target', 'wn8': 'wn8'}
TEXT_COLORS = {'text': COLOR_NEUTRAL, 'muted': COLOR_MUTED, 'good': COLOR_UP, 'bad': COLOR_DOWN}
ESTIMATE = u'~%s'
DETAIL_SIZE_STEP = 2
MIN_DETAIL_SIZE = 8
CARD_WIDTH = 230

PREVIEW_SIZE = (320, 70)
PREVIEW_ENEMY_MAX = 14700
PREVIEW_ENEMY_HP = 8580
PREVIEW_COUNTS = {'damage': 1850, 'frags': 1, 'spot': 2, 'def': 0}
PREVIEW_ROW = {
    'avg_damage': 1720.0,
    'wn8': {'value': 2104.9, 'tier': 'very_good'},
    'expected': {'damage': 1180.0, 'spot': 1.42, 'frag': 0.98, 'def': 0.75, 'win_rate': 52.3},
}

EDITOR_GROUPS = (
    ('rows', ('row_main_gun', 'row_wn8')),
)
