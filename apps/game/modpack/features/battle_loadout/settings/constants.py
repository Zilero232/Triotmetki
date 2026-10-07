from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'battle_loadout'
PANEL_ID = 'battle_loadout'
GROUP = 'battle'

# RU 1.45 gui_battle ConsumablesPanel.updatePosition centres the stock panel on the screen.
DEFAULTS = {
    'x': 0,
    'y': -70,
    'align_x': 'center',
    'align_y': 'bottom',
    'pinned': True,
}
FIXED = {
    'stock_size': True,
    'icon_size': 40,
}
ADVANCED = ('pinned',)
RETIRED_PLACES = (
    (-200, -66, 'center', 'bottom'),
    (-480, -14, 'center', 'bottom'),
    (0, -200, 'center', 'bottom'),
    (-360, -8, 'center', 'bottom'),
    (-120, -64, 'center', 'bottom'),
    (0, -64, 'center', 'bottom'),
)
