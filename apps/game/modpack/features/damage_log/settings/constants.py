from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'battle_damage_log'
PANEL_ID = 'damage_log'
STYLE_FULL = 'full'
STYLE_COMPACT = 'compact'
STYLE_MINIMAL = 'minimal'
STYLE_CUSTOM = 'custom'
STYLES = (STYLE_FULL, STYLE_COMPACT, STYLE_MINIMAL, STYLE_CUSTOM)
SECTIONS = ('both', 'dealt', 'received')
# Colour sets of the text lines (model PALETTES): the classic one, our graphite and gold, high contrast, colour-blind
# safe.
PALETTES = ('classic', 'graphite', 'contrast', 'colorblind')
MAX_TEMPLATE = 600
TEMPLATE_KEYS = ('template', 'entry_template')
LIMITS = {'dealt_lines': (0, 10), 'received_lines': (0, 10)}

DEFAULTS = {
    'x': 232,
    'y': -6,
    'align_x': 'left',
    'align_y': 'bottom',
    'style': 'full',
    'keep_stock': False,
    'sections': 'both',
    'dealt_lines': 6,
    'received_lines': 4,
    'group_by_target': True,
    'show_hp': True,
    'show_misses': True,
    'show_received_blocked': True,
    'show_assist_rows': True,
    'show_notes': True,
    'palette': 'graphite',
    'template': '{dealt} | {blocked} | {assisted} | {received}',
    'entry_template': '',
}
# Retired options and the values the code keeps reading: kind icons and kind colours on, the colours of the chosen
# palette.
FIXED = {
    'kind_icons': True,
    'kind_colors': True,
    'color_damage': '',
    'color_assist': '',
    'color_blocked': '',
    'color_received': '',
}
ADVANCED = ('keep_stock', 'template', 'entry_template')
# The default places of older versions (x, y, align_x, align_y): a panel still at one moves to today's default.
RETIRED_PLACES = (
    (250, -260, 'left', 'bottom'),
)
