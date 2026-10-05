from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'battle_loadout'
PANEL_ID = 'battle_loadout'
GROUP = 'battle'

# Beside the stock consumables panel at its height, as kurzdor's battleequipment (Lebwa, Jove) places the row: the page
# puts its right edge 12 px left of the panel's live width, 8 px over the bottom edge, and above the panel when it would
# meet the battle log (core/hud/panel ATTACHED bar_left); pinned there, the row belongs to the stock panel. This place
# (centred 360 px left of the middle) is the one for the fallback width and the GUIFlash renderer.
DEFAULTS = {
    'x': -360,
    'y': -8,
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
    (0, -64, 'center', 'bottom'),
)
