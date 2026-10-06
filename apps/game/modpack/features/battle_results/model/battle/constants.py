# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from .....core.format import COLOR_DOWN, COLOR_MUTED, COLOR_UP

# The Gameface page's widget of the previous battle's card (ui-web/src/entities/hud/battle-summary).
WIDGET_KIND = 'battle_summary'
LIMITS = {'card': 32, 'title': 48, 'subtitle': 64, 'label': 24, 'value': 24, 'tiles': 6, 'rows': 4}

# The tiles of the card: (stat, glyph, i18n label, tone).
LAST_TILES = (
    ('damage', 'damage', 'br_tile_damage', 'text'),
    ('xp', 'points', 'br_tile_xp', 'gold'),
    ('net_credits', None, 'br_tile_credits', 'gold'),
)

# The text colours of the tones; any other tone is the plain text colour.
TONE_COLORS = {'good': COLOR_UP, 'bad': COLOR_DOWN, 'muted': COLOR_MUTED}
ROW_GLYPHS = {'marks': 'wn8'}
SUBTITLE_SEPARATOR = u' · '
TILE_SEPARATOR = u'   '

# The previous battle's card shows this long (s), then hides by itself; one at a time, at most QUEUE_SIZE wait behind
# it. The page slides it in and fades it out over the same time (the widget's `show_s`).
LAST_SHOW_S = 8.0
QUEUE_SIZE = 5

# The edit mode and catalog sample: the last battle's results.
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

# RU 1.45 client source: the stock battle notifier (gui/Scaleform/daapi/view/battle/shared/battle_notifier.py) shows the
# previous battle's result in battle only when the arena's bonus type has it (its controller exists:
# controllers/repositories.py, arena_visitor.hasBattleNotifier), the server enables it
# (helpers/server_settings.isBattleNotifierEnabled) and the game option enableBattleNotifier is on
# (settings_constants.GAME.ENABLE_BATTLE_NOTIFIER). The names of the reads, in the order the log writes them.
NOTIFIER_READS = ('arena', 'server', 'option')
NOTIFIER_SHOWN = 'battle_results: the stock battle notifier shows the previous battle (%s): our card stays hidden'
NOTIFIER_NOT_SHOWN = 'battle_results: the stock battle notifier does not show the previous battle (%s): our card shows'
