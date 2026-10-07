from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.native_settings import NATIVE, TRI_STATE
from ..model.constants import DRUM_BARS, DRUM_OFF, DRUM_SHELLS, MARK_COLORS, VECTOR_MARKS

SWITCH = 'crosshair_presets'
GROUP = 'battle'
PANEL_ID = 'crosshair'

PRESETS = (NATIVE, 'classic', 'minimal', 'contrast', 'clean')
MODES = ('both', 'arcade', 'sniper')
FULL_COLOUR_MARKS = ('colorblind', 'triad', 'arcs', 'stack', 'kenney_cluster', 'kenney_arrows', 'kenney_scope')
MARKS = ('none',) + VECTOR_MARKS + FULL_COLOUR_MARKS
DRUM_STYLES = (DRUM_SHELLS, DRUM_BARS, DRUM_OFF)

DEFAULTS = {
    'preset': 'minimal',
    'modes': 'both',
    'server_reticle': NATIVE,
    'mark': 'none',
    'mark_size': 32,
    'mark_color': 'orange',
    'mark_outline': True,
    'mark_hides_centre': True,
    'reload_box': True,
    'drum_style': 'shells',
    'reload_arcs': False,
    'show_zoom': True,
    'x': 0,
    'y': 0,
    'align_x': 'center',
    'align_y': 'center',
    'drag': False,
}

CHOICES = {
    'preset': PRESETS,
    'modes': MODES,
    'server_reticle': TRI_STATE,
    'mark': MARKS,
    'mark_color': MARK_COLORS,
    'drum_style': DRUM_STYLES,
}

LIMITS = {'mark_size': (16, 128), 'x': (-200, 200), 'y': (-200, 200)}
