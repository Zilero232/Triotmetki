# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

# The client's marks-of-excellence metric: damage + max(radio, track, stun assist) as a 100-battle EMA.
EMA_WINDOW = 100
EMA_K = 2.0 / (EMA_WINDOW + 1)
MARK_LEVELS = (65.0, 85.0, 95.0)
TARGET_LEVELS = (65.0, 85.0, 95.0, 100.0)
MAX_PERCENT = 100.0

# The dossier's damageRating is hundredths of a percent; the battle results' is a whole percent (results.py), so the
# results' value is up to half a percent off the dossier's. One battle moves the EMA by 2/101 of the gap to the
# battle's damage: more than 10 % in one battle is a misread, not a battle.
RATING_SCALE = 100
MAX_RATING = 100 * RATING_SCALE
RESULTS_ROUNDING = RATING_SCALE // 2
MAX_BATTLE_CHANGE = 10 * RATING_SCALE

# The battles-to-mark forecast: at most this many battles, and the pace from at least PACE_MIN of the
# last PACE_BATTLES own battles of the tank.
MAX_FORECAST_BATTLES = 999
PACE_BATTLES = 20
PACE_MIN = 3
PACE_TANKS = 300

# GET /v1/moe/<tank_id> answers are kept this long (a failed read for less).
THRESHOLD_TTL_S = 6 * 3600
THRESHOLD_ERROR_TTL_S = 10 * 60

# The damage-for-percent curve a tank has before the site serves its thresholds: the median shape of 782 RU tanks'
# published thresholds (2026-10, each tank's damage at a percent over its damage at 65 %, as the marks mods cache them;
# the middle 80 % of tanks stay within 5 % of it between 40 and 85 %), scaled through the one point the dossier gives:
# the tank's own EMA at its own percent. Good near the current percent, rough far from it: an estimate, marked so.
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
# How a marks view colours the percent: by the battle's change, by the mark it is at, or not at all.
COLOR_MODE_DELTA = 'delta'
COLOR_MODE_MARK = 'mark'
COLOR_MODE_OFF = 'off'
COLOR_MODES = (COLOR_MODE_DELTA, COLOR_MODE_MARK, COLOR_MODE_OFF)

# The mastery badges of GET /v1/moe/<tank_id> `mastery` (base XP of one battle per badge), with the dossier's
# markOfMastery value each one is: 1 third class, 2 second, 3 first, 4 Ace Tanker.
MASTERY_CLASSES = (('class3', 1), ('class2', 2), ('class1', 3), ('ace', 4))
