# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from .....core.format import COLOR_DOWN, COLOR_MUTED, COLOR_UP

# The Gameface page's widget of both battle cards (ui-web/src/entities/hud-widgets/battle-summary).
WIDGET_KIND = 'battle_summary'
LIMITS = {'title': 48, 'subtitle': 64, 'label': 24, 'value': 24, 'tiles': 6, 'rows': 4}

# This battle's own counts. RU 1.45 BattleSummaryFeedbackEvent and the personal efficiency controller report the radio
# and track assist as one total (`assist_total`, getTotalAssistDamage / ASSIST_DAMAGE); the feedback events keep them
# apart, which the marks metric needs (damage + the best of radio, track and stun).
COUNT_KEYS = ('damage', 'radio', 'track', 'stun', 'blocked', 'spotted', 'frags', 'assist_total')

# The tiles of each card: (stat, glyph, i18n label, tone). XP is left out of the battle card: the client shows no XP in
# a random battle, so there is none to read before the results.
LIVE_TILES = (
    ('damage', 'damage', 'br_tile_damage', 'text'),
    ('assist', 'radio', 'br_tile_assist', 'radio'),
    ('blocked', 'blocked', 'br_tile_blocked', 'blocked'),
    ('spotted', 'lamp', 'br_tile_spotted', 'text'),
    ('frags', 'cross', 'br_tile_frags', 'text'),
)
LAST_TILES = (
    ('damage', 'damage', 'br_tile_damage', 'text'),
    ('xp', 'points', 'br_tile_xp', 'gold'),
    ('net_credits', None, 'br_tile_credits', 'gold'),
)

RESULT_TONES = {'win': 'good', 'loss': 'bad', 'draw': 'muted'}
# GUIFlash text colours of the tones; any other tone is the plain text colour.
TONE_COLORS = {'good': COLOR_UP, 'bad': COLOR_DOWN, 'muted': COLOR_MUTED}
ROW_GLYPHS = {'marks': 'wn8', 'main_gun': 'target', 'record': 'record'}

# The «Основной калибр» states battle_progress reports (its model/constants): the word in place of the damage (i18n
# key), the value tone and the bar tone.
MAIN_GUN_LOOKS = {
    'progress': {'word': None, 'tone': 'text', 'bar': 'gold'},
    'reached': {'word': None, 'tone': 'good', 'bar': None},
    'unreachable': {'word': 'br_main_gun_unreachable', 'tone': 'muted', 'bar': None},
    'failed': {'word': 'br_main_gun_failed', 'tone': 'bad', 'bar': None},
}
RECORD_METRIC = 'damage'
OF_TARGET = u'/ %s'
BEATEN_BY = u'+%s'
SUBTITLE_SEPARATOR = u' · '
TILE_SEPARATOR = u'   '

# The previous battle's card shows this long (s), one at a time; at most QUEUE_SIZE wait behind it.
LAST_SHOW_S = 10.0
QUEUE_SIZE = 5

# The edit mode and catalog samples: a battle that went well so far, and the last battle's results.
PREVIEW_SIZE = (260, 150)
PREVIEW_FONT_SIZE = 14
PREVIEW_STATS = {'damage': 2840, 'radio': 960, 'track': 410, 'stun': 0, 'blocked': 1350, 'spotted': 3, 'frags': 2}
PREVIEW_SNAPSHOT = {'moving_avg_damage': 2950, 'damage_rating': 8412, 'marks_on_gun': 2}
PREVIEW_CURVE = {'thresholds': {'65': 2100, '85': 2900, '95': 3500}}
PREVIEW_PROGRESS = {
    'main_gun': {'damage': 2840, 'need': 2940, 'status': 'progress'},
    'record': {'damage': 6812},
}
PREVIEW_BATTLE = {'vehicle': u'Т-34-85', 'map': u'Прохоровка', 'result': 'win'}
PREVIEW_LAST = {
    'vehicle': u'Т-34-85',
    'map': u'Малиновка',
    'result': 'loss',
    'damage': 1960,
    'xp': 812,
    'net_credits': 23450,
    'moe_percent': 84.0,
    'moe_delta': -0.42,
}

# ClientArena's winner team of a draw.
DRAW_TEAM = 0
