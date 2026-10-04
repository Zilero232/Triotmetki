from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'battle_loadout'
PANEL_ID = 'battle_loadout'
GROUP = 'battle'

# Right on top of the stock consumables panel, centred with it (core/hud/panel DOCK_ANCHORS battle_bottom_center), and
# pinned there: the row belongs to the stock panel under it.
DEFAULTS = {
    'x': 0,
    'y': -64,
    'align_x': 'center',
    'align_y': 'bottom',
    'pinned': True,
}
# Retired options and the values the code keeps reading: the cells always take the stock slot size.
FIXED = {
    'stock_size': True,
    'icon_size': 40,
}
ADVANCED = ('pinned',)
# The default places of older versions (x, y, align_x, align_y): a panel still at one moves to today's default.
RETIRED_PLACES = (
    (-200, -66, 'center', 'bottom'),
    (-480, -14, 'center', 'bottom'),
    (0, -200, 'center', 'bottom'),
)
