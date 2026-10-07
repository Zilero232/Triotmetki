from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.native_settings import NATIVE, TRI_STATE

SWITCH = 'camera_tweaks'
GROUP = 'battle'

SNIPER_ZOOMS = (NATIVE, 'remember', 'x2', 'x4', 'x8')
CAMERA_PRESETS = (NATIVE, 'sniper', 'balanced', 'dynamic')

DEFAULTS = {
    'preset': NATIVE,
    'sniper_zoom': 'remember',
    'dynamic_camera': 'off',
    'horizontal_stabilization': 'on',
}

CHOICES = {
    'preset': CAMERA_PRESETS,
    'sniper_zoom': SNIPER_ZOOMS,
    'dynamic_camera': TRI_STATE,
    'horizontal_stabilization': TRI_STATE,
}
