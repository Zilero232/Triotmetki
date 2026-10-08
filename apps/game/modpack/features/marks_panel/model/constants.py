# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import re

from ....core.format import COLOR_DOWN, COLOR_NEUTRAL, COLOR_UP
from ..settings.constants import STYLE_COMPACT, STYLE_MINIMAL

TARGET_SEPARATOR = u'   '
LINE_SEPARATOR = u'\n'
TITLE_SIZE_STEP = 2
LINE_KEYS = {STYLE_MINIMAL: 'marks_panel_line_minimal', STYLE_COMPACT: 'marks_panel_line_compact'}
LINE_KEY_COMPACT_UP = 'marks_panel_line_compact_up'

KIND_DAMAGE = 'damage'
KIND_RADIO = 'radio'
KIND_TRACK = 'track'
KIND_STUN = 'stun'
KINDS = (KIND_DAMAGE, KIND_RADIO, KIND_TRACK, KIND_STUN)

SOURCE_VERIFIED = 'verified'
SOURCE_ESTIMATED = 'estimated'
APPROX = u'~'
CURVE_SITE = 'site'
CURVE_ESTIMATED = 'estimated'

MARK_TONES = ('muted', 'text', 'text', 'gold')

KIND = 'marks_panel'
MARKS_CAP = 'DOSSIER_MARKS_ON_GUN'
# RU 1.45 common/constants.py ARENA_BONUS_TYPE.REGULAR: random battles always move the marks on gun.
MARKS_BONUS_TYPES = (1,)
BAR_DAMAGE = 'damage'
MAX_STARS = 3
NO_ROWS = {'thresholds': [], 'step': None, 'average': None}

PREVIEW_SIZE = (230, 62)
PREVIEW_SNAPSHOT = {'moving_avg_damage': 2540, 'damage_rating': 8612, 'marks_on_gun': 2}
PREVIEW_THRESHOLDS = {'thresholds': {'65': 1900, '85': 2450, '95': 3050, '100': 3900}}
PREVIEW_COMBINED = 3100
PREVIEW_PACE = 3400
PREVIEW_CLASS = 'mediumTank'

TANK_CARD_KIND = 'tank_card'
CARD_STEP = 0.5
ACE_LEVEL = 4
CARD_PREVIEW_SIZE = (264, 150)
CARD_PREVIEW_TIER = 7
CELL_PERCENT_DIGITS = u'%.2f'
CELL_DECIMAL = u','
CELL_PERCENT = u' %'
CARD_PREVIEW_VEHICLE = u'Т-34-85'
CARD_PREVIEW_SUMMARY = {'last_delta': 0.18, 'trend': -0.12, 'trend_battles': 5, 'deltas': [0.4, -0.3, 0.1, -0.5, 0.18]}
CARD_PREVIEW_TANK = {'wn8': {'value': 2310, 'tier': 'very_good'}, 'win_rate': 56.2, 'battles': 213}
RESEARCH_ROWS = 2
CARD_PREVIEW_MASTERY = ((1, 540), (2, 710), (3, 960), (4, 1320))
CARD_PREVIEW_OWN_MASTERY = 2
CARD_PREVIEW_RESEARCH = {
    'xp': 8400,
    'elite': False,
    'avg_xp': 780,
    'nodes': (
        {'id': 1, 'cost': 23100, 'vehicle': False, 'name': u'Д-10Т', 'tier': 8, 'required': ()},
        {'id': 3, 'cost': 9800, 'vehicle': False, 'name': u'В-2-44', 'tier': 7, 'required': ()},
        {'id': 2, 'cost': 51600, 'vehicle': True, 'name': u'Т-54', 'tier': 9, 'required': (1,)},
    ),
}

METRIC_SEPARATOR = u' · '

HISTORY_FILE = 'marks_history_%d.json'
HISTORY_VERSION = 1
MAX_VEHICLES = 300
MAX_DETAIL_LINES = 12

SOURCE_BATTLE = 'battle'
SOURCE_HANGAR = 'hangar'
READING_KEYS = ('rating', 'avg', 'marks')
MAX_BATTLE_DELTA = 10.0
RESULTS_PERCENT_MAX = 100
WRONG_SCALE_SPAN = 1000
LOG_REPAIRED = 'marks history: dropped %d battle entries stored as a whole percent'
LOG_REJECTED = 'marks history: battle of tank %s not recorded, %s'
ASSIST_STATS = ('damage_assisted_radio', 'damage_assisted_track', 'damage_assisted_stun')

ACTION_CLEAR = 'clear'
SITE_PROGRESS_PATH = '/me/progress'

REPORT_BATTLES = 25
REPORT_CHART = 100
REPORT_TRENDS = (10, 25)
# nations.NAMES of the RU 1.45 client, in the order of a compact descriptor's nation index.
NATION_NAMES = (
    'ussr',
    'germany',
    'usa',
    'china',
    'france',
    'uk',
    'japan',
    'czech',
    'sweden',
    'poland',
    'italy',
    'intunion',
)
NATION_BITS_SHIFT = 4
NATION_BITS_MASK = 15
CLASS_TAGS = ('lightTank', 'mediumTank', 'heavyTank', 'AT-SPG', 'SPG')

ITEM_CODE = re.compile(r'^[A-Za-z]{1,3}\d+[A-Za-z]?_')

PERCENT_FORMAT = u'%.2f%%'
NO_VALUE = u'—'
ENTRY_MOMENT_FORMAT = '%d.%m %H:%M'

DELTA_COLORS = {1: COLOR_UP, 0: COLOR_NEUTRAL, -1: COLOR_DOWN}
DELTA_TONES = {1: 'good', 0: 'muted', -1: 'bad'}

EDITOR_GROUPS = (
    ('battle', ('style', 'bar', 'color_mode')),
    ('numbers', ('show_targets',)),
)
CARD_EDITOR_GROUPS = (
    ('card', ('style',)),
    ('rows', ('show_trend', 'show_tank_ratings')),
    ('carousel', ('carousel_percent',)),
)

CAROUSEL_GAP = u'   '

MOE_BONUS_TYPES = (1,)
