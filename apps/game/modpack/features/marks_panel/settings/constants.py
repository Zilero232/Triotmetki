from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.moe import COLOR_MODES  # noqa: F401

GROUP = 'battle'
SWITCH = 'battle_moe_panel'
PANEL_ID = 'marks_panel'
CARD_PANEL_ID = 'hangar_marks'
CARD_SWITCH = 'hangar_tank_card'
CARD_GROUP = 'hangar'
STYLE_COMPACT = 'compact'
STYLE_EXTENDED = 'extended'
STYLE_MINIMAL = 'minimal'
STYLE_CUSTOM = 'custom'
STYLES = (STYLE_COMPACT, STYLE_EXTENDED, STYLE_MINIMAL, STYLE_CUSTOM)
CARD_STYLES = (STYLE_COMPACT, STYLE_EXTENDED)
BARS = ('damage', 'percent')
MAX_TEMPLATE = 400

DEFAULTS = {
    'x': 330,
    'y': 0,
    'align_x': 'center',
    'align_y': 'bottom',
    'style': 'compact',
    'template': '',
    'show_targets': True,
    'show_battle': True,
    'show_step': True,
    'show_up': True,
    'color_mode': 'delta',
    'bar': 'damage',
}
FIXED = {
    'step': '0.5',
}
ADVANCED = ('show_battle', 'show_step', 'show_up', 'template')
RETIRED_PLACES = (
    (0, 120, 'center', 'top'),
    (208, 8, 'left', 'top'),
    (490, -6, 'left', 'bottom'),
    (372, 60, 'left', 'top'),
    (330, -8, 'center', 'bottom'),
)

CARD_DEFAULTS = {
    'x': 16,
    'y': 440,
    'align_x': 'left',
    'align_y': 'top',
    'style': 'compact',
    'show_trend': True,
    'trend_battles': 5,
    'show_tank_ratings': True,
    'show_mastery': True,
    'show_research': True,
    'carousel_percent': False,
}
CARD_LIMITS = {
    'trend_battles': (1, 50),
}
CARD_FIXED = {
    'max_entries': 100,
    'page_rows': 50,
}
CARD_ADVANCED = ('show_mastery', 'show_research', 'trend_battles')
