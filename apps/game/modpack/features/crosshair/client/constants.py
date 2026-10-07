from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: gui.battle_control.battle_constants CROSSHAIR_VIEW_ID.
VIEW_ARCADE = 1
VIEW_SNIPER = 2
VIEW_STRATEGIC = 3
READOUT_VIEWS = (VIEW_ARCADE, VIEW_SNIPER, VIEW_STRATEGIC)
# RU 1.45 battle_constants VEHICLE_VIEW_STATE: HEALTH (Avatar.updateVehicleHealth), DESTROYED.
STATE_HEALTH = 'health'
STATE_DESTROYED = 'destroyed'
READOUT_STATES = (
    ('HEALTH', STATE_HEALTH),
    ('DESTROYED', STATE_DESTROYED),
)
# RU 1.45 gun_marker_ctrl._DefaultGunMarkerController.update ends with _dataProvider.updateSize.
MARKER_METHOD = 'update'
MARKER_RELAX_ARG = 4
# The ammo controller's events after which the own magazine is read again (RU 1.45 ammo_ctrl.AmmoController).
CLIP_EVENTS = ('onShellsUpdated', 'onCurrentShellChanged', 'onGunSettingsSet')
