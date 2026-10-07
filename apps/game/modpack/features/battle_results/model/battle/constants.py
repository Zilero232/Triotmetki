# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from .....core.format import COLOR_DOWN, COLOR_MUTED, COLOR_UP

WIDGET_KIND = 'battle_summary'
LIMITS = {'card': 32, 'title': 48, 'subtitle': 64, 'label': 24, 'value': 24, 'tiles': 6, 'rows': 4}

LAST_TILES = (
    ('damage', 'damage', 'br_tile_damage', 'text'),
    ('xp', 'points', 'br_tile_xp', 'gold'),
    ('net_credits', None, 'br_tile_credits', 'gold'),
)

TONE_COLORS = {'good': COLOR_UP, 'bad': COLOR_DOWN, 'muted': COLOR_MUTED}
ROW_GLYPHS = {'marks': 'wn8'}
SUBTITLE_SEPARATOR = u' · '
TILE_SEPARATOR = u'   '

LAST_SHOW_S = 8.0
QUEUE_SIZE = 5

PREVIEW_SIZE = (260, 110)
PREVIEW_FONT_SIZE = 14
PREVIEW_LAST = {
    'arena': 1,
    'vehicle': u'Т-34-85',
    'map': 'br_preview_map',
    'result': 'loss',
    'damage': 1960,
    'xp': 812,
    'net_credits': 23450,
    'moe_percent': 84.0,
    'moe_delta': -0.42,
}

# RU 1.45 client source: gui/Scaleform/daapi/view/battle/shared/battle_notifier.py.
NOTIFIER_READS = ('arena', 'server', 'option')
NOTIFIER_SHOWN = 'battle_results: the stock battle notifier shows the previous battle (%s): our card stays hidden'
NOTIFIER_NOT_SHOWN = 'battle_results: the stock battle notifier does not show the previous battle (%s): our card shows'
