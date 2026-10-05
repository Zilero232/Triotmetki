from __future__ import absolute_import, division, print_function, unicode_literals

# CROSSHAIR_VIEW_ID of gui.battle_control.battle_constants (RU 1.45 client source).
VIEW_ARCADE = 1
VIEW_SNIPER = 2
# VEHICLE_VIEW_STATE names the readouts follow (RU 1.45 battle_constants): HEALTH carries the own HP
# (Avatar.updateVehicleHealth), DESTROYED the death.
READOUT_STATES = (
    ('HEALTH', 'health'),
    ('DESTROYED', 'destroyed'),
)
# The ammo controller's events after which the own magazine is read again (RU 1.45 ammo_ctrl.AmmoController).
CLIP_EVENTS = ('onShellsUpdated', 'onCurrentShellChanged', 'onGunSettingsSet')
