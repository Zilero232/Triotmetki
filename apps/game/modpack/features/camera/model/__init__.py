from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.native_settings import NATIVE, from_table, native_values, tri_state
from .constants import CAMERA_PRESETS, DYNAMIC_CAMERA, HORIZONTAL_STABILIZATION, SNIPER_ZOOM, SNIPER_ZOOM_VALUES

FIELDS = {
    'sniper_zoom': (SNIPER_ZOOM, from_table(SNIPER_ZOOM_VALUES)),
    'dynamic_camera': (DYNAMIC_CAMERA, tri_state),
    'horizontal_stabilization': (HORIZONTAL_STABILIZATION, tri_state),
}

# Left out (README "Camera"): extra zoom steps or camera distance
# beyond the client's own options, free-look / pitch limits and the commander camera. All of them need
# overriding the camera configuration (PMOD-style), which is not a setting the game exposes.


def resolve(values):
    resolved = dict(values)
    for key, value in CAMERA_PRESETS.get(values.get('preset'), {}).items():
        if resolved.get(key, NATIVE) == NATIVE:
            resolved[key] = value
    return resolved


# A preset is chosen to take over its fields: the ones the same change did not set go back to the game's value, so the
# preset fills them (resolve) instead of the recommended values a fresh install starts with.
def preset_reset(values, changed):
    if 'preset' not in changed:
        return {}
    covered = CAMERA_PRESETS.get(values.get('preset'), {})
    return {key: NATIVE for key in covered if key not in changed}


def to_native(values):
    return native_values(resolve(values), FIELDS)
