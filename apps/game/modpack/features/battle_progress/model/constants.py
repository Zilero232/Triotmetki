# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_DOWN, COLOR_MUTED, COLOR_NEUTRAL, COLOR_UP

# RU 1.45 client source, common/arena_achievements.py ACHIEVEMENT_CONDITIONS['mainGun']: at least 1000 damage and at
# least 20% of the enemy team's total HP. text/ru/lc_messages/achievements.po mainGun_condition adds: never hit allies
# with direct shots, random battles only; mainGun_descr: the most damage in the battle, which only the server knows.
MIN_DAMAGE = 1000
MIN_SHARE_OF_ENEMY_HP = 0.2

# The medal's state for the player: still to earn, threshold reached, out of reach (the enemies have less HP left than
# the damage still needed), lost (an own shot hit an ally).
PROGRESS = 'progress'
REACHED = 'reached'
UNREACHABLE = 'unreachable'
FAILED = 'failed'
# How the row looks in each state: the word in place of the damage (i18n key), the value tone and the bar tone.
MAIN_GUN_LOOKS = {
    PROGRESS: {'word': None, 'tone': 'text', 'bar': 'gold'},
    REACHED: {'word': None, 'tone': 'good', 'bar': 'good'},
    UNREACHABLE: {'word': 'bp_unreachable', 'tone': 'muted', 'bar': None},
    FAILED: {'word': 'bp_failed', 'tone': 'bad', 'bar': None},
}

# The WN8 formula (wnefficiency.net, the version the site computes): the ratios are cut at these floors, the frag,
# spot and defence ratios capped by the damage ratio plus these margins, the win ratio at WIN_CAP.
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
# The outcome is unknown until the battle ends: the estimate takes the tank's expected win rate (a neutral rWIN of 1).
NEUTRAL_WIN_RATIO = 1.0

# The site's rating scale (@otmetki/ratings RATING_SCALES.wn8, RATING_TIERS): the lower bound of every tier, worst to
# best, and one colour per tier, XVM-style.
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

# This battle's own counts: WN8 reads damage, spotted, frags and capture points reset; the record row damage, assist
# and frags. The dossier's maxAssisted is track + radio + stun assist
# (dossiers2/custom/battle_results_processors.py:437, RU 1.45), so stun counts as assist.
COUNT_KEYS = ('damage', 'assist', 'frags', 'spot', 'def')
KIND_BY_EVENT = (
    ('RADIO_ASSIST', 'assist'),
    ('TRACK_ASSIST', 'assist'),
    ('STUN_ASSIST', 'assist'),
    ('KILL', 'frags'),
    ('SPOTTED', 'spot'),
    ('BASE_CAPTURE_DROPPED', 'def'),
)
# Counted whoever the event names: the target of BASE_CAPTURE_DROPPED is no enemy vehicle.
ANY_TARGET_KEYS = ('def',)
# Counted by the damage the event's extra carries; the other keys count one per event.
AMOUNT_KEYS = ('assist',)

# The per-tank records: the own dossier's max15x15 block, the site's career records and the own battle results. XP is
# known only from the battle results, so a row counts toward the other three.
METRICS = ('damage', 'assist', 'frags', 'xp')
LIVE_METRICS = ('damage', 'assist', 'frags')
ASSIST_STATS = ('damage_assisted_radio', 'damage_assisted_track', 'damage_assisted_stun')
# The fallback when the client's bonus caps cannot be read: the random battle, the main type the dossier's max15x15
# counts.
RANDOM_BONUS_TYPE = 1
# The file name and format of the personal_best component this one replaced, so the records survive the update.
STORE_FILE = 'personal_best_%d.json'
MAX_TANKS = 500

# The plate: one row per target in this order, each with its glyph; GUIFlash text colours of the row tones.
ROWS = ('main_gun', 'record', 'wn8')
ROW_GLYPHS = {'main_gun': 'target', 'record': 'record', 'wn8': 'wn8'}
TEXT_COLORS = {'text': COLOR_NEUTRAL, 'muted': COLOR_MUTED, 'good': COLOR_UP, 'bad': COLOR_DOWN}
OF_TARGET = u'/ %s'
BEATEN_BY = u'+%s'
ESTIMATE = u'~%s'
DETAIL_SIZE_STEP = 2
MIN_DETAIL_SIZE = 8
CARD_WIDTH = 230

PREVIEW_SIZE = (320, 90)
PREVIEW_ENEMY_MAX = 14700
PREVIEW_ENEMY_HP = 8580
PREVIEW_COUNTS = {'damage': 1850, 'assist': 840, 'frags': 1, 'spot': 2, 'def': 0}
PREVIEW_RECORD = {'damage': 6812, 'assist': 5120, 'frags': 6, 'xp': 2740}
PREVIEW_ROW = {
    'avg_damage': 1720.0,
    'wn8': {'value': 2104.9, 'tier': 'very_good'},
    'expected': {'damage': 1180.0, 'spot': 1.42, 'frag': 0.98, 'def': 0.75, 'win_rate': 52.3},
}

# The settings window editor: field groups (spec 2026-09-30 section 12.3).
EDITOR_GROUPS = (
    ('rows', ('row_main_gun', 'row_record', 'record_metric', 'row_wn8')),
)
