# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import re

from ....core.format import COLOR_DOWN, COLOR_NEUTRAL, COLOR_UP

TARGET_SEPARATOR = u'   '
LINE_SEPARATOR = u'\n'
TITLE_SIZE_STEP = 2

KINDS = ('damage', 'radio', 'track', 'stun')

# Where the starting percent comes from (see panel_state); an estimate is marked `~` in the built-in lines.
SOURCE_VERIFIED = 'verified'
SOURCE_ESTIMATED = 'estimated'
APPROX = u'~'
# Where the curve comes from: the site's thresholds, or the estimate through the dossier's point until it has them.
CURVE_SITE = 'site'
CURVE_ESTIMATED = 'estimated'

# The percent's tone on the battle plate: by the change, or by how many mark levels (65, 85, 95) it has passed.
MARK_TONES = ('muted', 'text', 'text', 'gold')

KIND = 'marks_panel'
# The battle plate's bar (settings `bar`, the gunmarks «progress bar logic»): this battle's damage, or the percent.
BAR_DAMAGE = 'damage'
# The mark levels the battle plate draws as stars.
MAX_STARS = 3
# The detail rows of a plate that shows none (any style but the extended one, or no thresholds for the tank).
NO_ROWS = {'thresholds': [], 'step': None, 'average': None}

PREVIEW_SIZE = (230, 62)
PREVIEW_SNAPSHOT = {'moving_avg_damage': 2540, 'damage_rating': 8612, 'marks_on_gun': 2}
PREVIEW_THRESHOLDS = {'thresholds': {'65': 1900, '85': 2450, '95': 3050, '100': 3900}}
PREVIEW_COMBINED = 3100
PREVIEW_PACE = 3400
PREVIEW_CLASS = 'mediumTank'

# The hangar Tank card (model/card.py): its widget, the step its average line reads, the mastery level of the Ace badge
# (its label has no «badge» word), its preview.
TANK_CARD_KIND = 'tank_card'
CARD_STEP = 0.5
ACE_LEVEL = 4
CARD_PREVIEW_SIZE = (264, 150)
CARD_PREVIEW_TIER = 7
# The grid's percents as the HUD page writes its own: a decimal comma and a space before the sign.
CELL_PERCENT_DIGITS = u'%.2f'
CELL_DECIMAL = u','
CELL_PERCENT = u' %'
CARD_PREVIEW_VEHICLE = u'Т-34-85'
CARD_PREVIEW_SUMMARY = {'last_delta': 0.18, 'trend': -0.12, 'trend_battles': 5, 'deltas': [0.4, -0.3, 0.1, -0.5, 0.18]}
CARD_PREVIEW_TANK = {'wn8': {'value': 2310, 'tier': 'very_good'}, 'win_rate': 56.2, 'battles': 213}
# The Tank card's grid (model/tank_progress.py): the next tanks it lists, and its preview's mastery badges (dossier
# markOfMastery 2: the second class held) and research.
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
PERCENT_SUFFIX = u'%'

# One colour per tier of the site's rating scale (RATING_TIERS in @otmetki/ratings), worst to best, as the site shows
# them; the Tank card paints the tank's WN8 with it.
TIER_COLORS = {
    'very_bad': '#E3564A',
    'bad': '#F08A3E',
    'below_avg': '#F2C94C',
    'avg': '#D9D9B8',
    'good': '#7CD35B',
    'very_good': '#4FC3B0',
    'great': '#5B9BF2',
    'unicum': '#A06CF0',
    'super_unicum': '#D75BD9',
}
METRIC_SEPARATOR = u' · '

# The marks history: one file per account, its format version, the vehicles and the entries it keeps.
HISTORY_FILE = 'marks_history_%d.json'
HISTORY_VERSION = 1
MAX_VEHICLES = 300
MAX_DETAIL_LINES = 12

SOURCE_BATTLE = 'battle'
SOURCE_HANGAR = 'hangar'
# The dossier values of an entry: a hangar snapshot equal to the last entry in all of them is not recorded again.
READING_KEYS = ('rating', 'avg', 'marks')
# A change of more than this many percent in one battle is a misread (core.moe MAX_BATTLE_CHANGE): no delta shows it.
MAX_BATTLE_DELTA = 10.0
# The repair of entries an older version stored with the battle results' whole percent (67 for 66.47 %): a battle
# rating up to 100 among hundredths above it, within this many hundredths of them once scaled.
RESULTS_PERCENT_MAX = 100
WRONG_SCALE_SPAN = 1000
LOG_REPAIRED = 'marks history: dropped %d battle entries stored as a whole percent'
LOG_REJECTED = 'marks history: battle of tank %s not recorded, %s'
# A battle's combined damage is the damage dealt plus the best of these assists (the MoE formula).
ASSIST_STATS = ('damage_assisted_radio', 'damage_assisted_track', 'damage_assisted_stun')

ACTION_CLEAR = 'clear'
SITE_PROGRESS_PATH = '/me/progress'

# The «Расчёт отметок» report: battles in its table, entries in its chart, the windows of its trends.
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

# "ussr:R04_T-34" -> "T-34": the nation prefix and the item code before the name.
ITEM_CODE = re.compile(r'^[A-Za-z]{1,3}\d+[A-Za-z]?_')

PERCENT_FORMAT = u'%.2f%%'
NO_VALUE = u'—'
ENTRY_MOMENT_FORMAT = '%d.%m %H:%M'

# By the sign of a change (-1, 0, 1): its colour in the text panel, its tone on the card.
DELTA_COLORS = {1: COLOR_UP, 0: COLOR_NEUTRAL, -1: COLOR_DOWN}
DELTA_TONES = {1: 'good', 0: 'muted', -1: 'bad'}

# The settings window's editors: the battle panel (its look, then its numbers) and the hangar Tank card (its look, then
# its rows, then the carousel tiles).
EDITOR_GROUPS = (
    ('battle', ('style', 'bar', 'color_mode')),
    ('numbers', ('show_targets',)),
)
CARD_EDITOR_GROUPS = (
    ('card', ('style', 'alt_detail')),
    ('rows', ('show_trend', 'show_tank_ratings')),
    ('carousel', ('carousel_percent',)),
)

# The percent joins the stock stats row of a carousel tile (mastery, wins, marks), after the stock gap between them.
CAROUSEL_GAP = u'   '

# The bonus types (constants.ARENA_BONUS_TYPE) whose battles move the marks: the random battle, as session_stats counts.
MOE_BONUS_TYPES = (1,)
