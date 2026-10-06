from __future__ import absolute_import, division, print_function, unicode_literals

# CROSSHAIR_VIEW_ID of gui.battle_control.battle_constants (RU 1.45 client source). The centre mark follows the
# arcade and sniper reticles its `modes` name; the readouts every reticle with the stock reload timer (the strategic
# view's too), never the postmortem view.
VIEW_ARCADE = 1
VIEW_SNIPER = 2
VIEW_STRATEGIC = 3
READOUT_VIEWS = (VIEW_ARCADE, VIEW_SNIPER, VIEW_STRATEGIC)
# VEHICLE_VIEW_STATE names the readouts follow (RU 1.45 battle_constants): HEALTH carries the own HP
# (Avatar.updateVehicleHealth), DESTROYED the death.
READOUT_STATES = (
    ('HEALTH', 'health'),
    ('DESTROYED', 'destroyed'),
)
# gun_marker_ctrl._DefaultGunMarkerController (RU 1.45): the arcade and sniper gun markers, client, server and dual
# accuracy alike. update(markerType, pos, direction, sizeVector, relaxTime, collData) records the size for the replay,
# then ends with `_dataProvider.updateSize(size, relaxTime)`; the strategic (SPG) markers are another class and stay
# stock, as in DispersionReticle.
MARKER_METHOD = 'update'
MARKER_RELAX_ARG = 4
# The ammo controller's events after which the own magazine is read again (RU 1.45 ammo_ctrl.AmmoController).
CLIP_EVENTS = ('onShellsUpdated', 'onCurrentShellChanged', 'onGunSettingsSet')
