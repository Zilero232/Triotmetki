from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'battle_loadout'
PANEL_ID = 'battle_loadout'
GROUP = 'battle'

# Above the left half of the stock consumables panel, ending 6 px left of the screen centre (core/hud/panel ATTACHED
# bar_left); the right half above the panel is the marks panel's when it lifts. Pinned there, the row belongs to the
# stock panel. This place is the one for the GUIFlash renderer.
DEFAULTS = {
    'x': -120,
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
    (0, -64, 'center', 'bottom'),
    (-360, -8, 'center', 'bottom'),
)
