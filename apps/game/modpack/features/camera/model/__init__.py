from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.native_settings import NATIVE, from_table, native_values, tri_state
from .constants import CAMERA_PRESETS, DYNAMIC_CAMERA, HORIZONTAL_STABILIZATION, SNIPER_ZOOM, SNIPER_ZOOM_VALUES

FIELDS = {
    'sniper_zoom': (SNIPER_ZOOM, from_table(SNIPER_ZOOM_VALUES)),
    'dynamic_camera': (DYNAMIC_CAMERA, tri_state),
    'horizontal_stabilization': (HORIZONTAL_STABILIZATION, tri_state),
}

# Left out (README "Camera"): extra zoom or distance, free-look and pitch limits, the commander camera.


def resolve(values):
    resolved = dict(values)
    for key, value in CAMERA_PRESETS.get(values.get('preset'), {}).items():
        if resolved.get(key, NATIVE) == NATIVE:
            resolved[key] = value
    return resolved


def preset_reset(values, changed):
    if 'preset' not in changed:
        return {}
    covered = CAMERA_PRESETS.get(values.get('preset'), {})
    return {key: NATIVE for key in covered if key not in changed}


def to_native(values):
    return native_values(resolve(values), FIELDS)
