from __future__ import absolute_import, division, print_function, unicode_literals

# Settings-core names, RU 1.45 client source (account_helpers/settings_core/settings_constants.py GAME.*).
# SNIPER_ZOOM is the "zoom when entering sniper mode" option of the game's own settings window
# (options.SniperZoomSetting: 0 remember the last zoom, 1 x2, 2 x4, 3 x8); the client has no option for
# the list of zoom steps itself.
SNIPER_ZOOM = 'sniperZoom'
DYNAMIC_CAMERA = 'dynamicCamera'
HORIZONTAL_STABILIZATION = 'horStabilizationSnp'

SNIPER_ZOOM_VALUES = {
    'remember': 0,
    'x2': 1,
    'x4': 2,
    'x8': 3,
}

CAMERA_PRESETS = {
    'sniper': {'sniper_zoom': 'x8', 'dynamic_camera': 'off', 'horizontal_stabilization': 'on'},
    'balanced': {'sniper_zoom': 'x4', 'dynamic_camera': 'off', 'horizontal_stabilization': 'on'},
    'dynamic': {'sniper_zoom': 'x2', 'dynamic_camera': 'on', 'horizontal_stabilization': 'on'},
}

# The settings window's editor (docs/specs/2026-09-30-hud-consolidation-and-design.md section 12.3): its field groups
# around a schematic sniper view the window draws from the field values.
EDITOR_GROUPS = (
    ('preset', ('preset',)),
    ('sniper', ('sniper_zoom', 'horizontal_stabilization')),
    ('camera', ('dynamic_camera',)),
)
SCHEMATIC = 'camera'
