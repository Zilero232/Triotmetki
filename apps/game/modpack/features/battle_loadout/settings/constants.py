from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'battle_loadout'
PANEL_ID = 'battle_loadout'
GROUP = 'battle'

# Centred right above the stock consumables panel, which the client centres on the screen (RU 1.45 gui_battle
# ConsumablesPanel.updatePosition: x = (stage width - panel width) / 2; core/hud/panel ATTACHED bar_above), as kurzdor's
# battleequipment sits. Pinned there, the row belongs to the stock panel. This place is the one for the GUIFlash
# renderer.
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
    (-360, -8, 'center', 'bottom'),
    (-120, -64, 'center', 'bottom'),
)
