from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'battle_damage_log'
PANEL_ID = 'damage_log'
STYLE_FULL = 'full'
STYLE_COMPACT = 'compact'
STYLE_MINIMAL = 'minimal'
STYLE_CUSTOM = 'custom'
STYLES = (STYLE_FULL, STYLE_COMPACT, STYLE_MINIMAL, STYLE_CUSTOM)
SECTIONS = ('both', 'dealt', 'received')
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
FIXED = {
    'kind_icons': True,
    'kind_colors': True,
    'color_damage': '',
    'color_assist': '',
    'color_blocked': '',
    'color_received': '',
}
ADVANCED = ('keep_stock', 'template', 'entry_template')
RETIRED_PLACES = (
    (250, -260, 'left', 'bottom'),
)
