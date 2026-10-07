# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

# The client's marks-of-excellence metric: damage + max(radio, track, stun assist) as a 100-battle EMA.
EMA_WINDOW = 100
EMA_K = 2.0 / (EMA_WINDOW + 1)
MARK_LEVELS = (65.0, 85.0, 95.0)
TARGET_LEVELS = (65.0, 85.0, 95.0, 100.0)
MAX_PERCENT = 100.0

RATING_SCALE = 100
MAX_RATING = 100 * RATING_SCALE
RESULTS_ROUNDING = RATING_SCALE // 2
MAX_BATTLE_CHANGE = 10 * RATING_SCALE

MAX_FORECAST_BATTLES = 999
PACE_BATTLES = 20
PACE_MIN = 3
PACE_TANKS = 300

THRESHOLD_TTL_S = 6 * 3600
THRESHOLD_ERROR_TTL_S = 10 * 60

ESTIMATE_SHAPE = (
    (20.0, 0.2656),
    (40.0, 0.601),
    (55.0, 0.8329),
    (65.0, 1.0),
    (75.0, 1.1924),
    (85.0, 1.4302),
    (95.0, 1.7727),
    (100.0, 2.0497),
)
ESTIMATE_MIN_PERCENT = 1.0

REACHED = u'✓'
STAR = u'★'
UNREACHABLE = u'∞'
MACRO_MISSING = u'-'
COLOR_MODE_DELTA = 'delta'
COLOR_MODE_MARK = 'mark'
COLOR_MODE_OFF = 'off'
COLOR_MODES = (COLOR_MODE_DELTA, COLOR_MODE_MARK, COLOR_MODE_OFF)

MASTERY_CLASSES = (('class3', 1), ('class2', 2), ('class1', 3), ('ace', 4))
