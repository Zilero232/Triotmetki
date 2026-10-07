from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_DOWN, COLOR_UP

SWITCH = 'battle_team_hp'
PANEL_ID = 'team_hp'
STYLE_COMPACT = 'compact'
STYLE_MINIMAL = 'minimal'
STYLES = ('full', 'segments', 'icons', STYLE_COMPACT, STYLE_MINIMAL, 'numbers', 'bars')
OVERLAY_STYLES = ('numbers',)
# RU 1.45 gui_battle BattlePage.as keeps the capture bars and quest progress under the stock strip.
BESIDE_STOCK_PLACE = (443, 4)
MAX_TEMPLATE = 400

DEFAULTS = {
    'x': 0,
    'y': 0,
    'align_x': 'center',
    'align_y': 'top',
    'style': 'icons',
    'show_score': True,
    'show_alive': False,
    'show_diff': True,
    'template': '',
    'replace_stock': True,
    'pinned': True,
}
FIXED = {
    'bar_width': 30,
    'icon_width': 3,
    'ally_color': COLOR_UP,
    'enemy_color': COLOR_DOWN,
}
ADVANCED = ('replace_stock', 'pinned', 'template')
RETIRED_PLACES = (
    (0, 58, 'center', 'top'),
    (0, 4, 'center', 'top'),
)
