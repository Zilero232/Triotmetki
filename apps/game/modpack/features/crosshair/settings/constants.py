from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.native_settings import NATIVE, TRI_STATE
from ..model.constants import MARK_COLORS, VECTOR_MARKS

SWITCH = 'crosshair_presets'
GROUP = 'battle'
PANEL_ID = 'crosshair'

PRESETS = (NATIVE, 'classic', 'minimal', 'contrast', 'clean')
MODES = ('both', 'arcade', 'sniper')
# Centre marks drawn over the game's own reticle centre: our vector marks (in MARK_COLORS, with an optional outline),
# our full-colour originals, then three of Kenney's CC0 pack.
FULL_COLOUR_MARKS = ('colorblind', 'triad', 'arcs', 'stack', 'kenney_cluster', 'kenney_arrows', 'kenney_scope')
MARKS = ('none',) + VECTOR_MARKS + FULL_COLOUR_MARKS

# preset: the recommended client value (core.client.native.ClientDefaults), the game's own reticle without the grid.
# mark: a thin chevron in the HUD index orange with its dark outline (docs/research/design/2026-10-03-competitor-ui.md
# B.1); the readouts beside the reticle show the own reload and repairs, the arcs are opt-in.
# x/y are the mark's offset from the reticle centre, not a screen position: the mark follows the reticle,
# so it is not dragged (a drag would save a screen position).
DEFAULTS = {
    'preset': 'minimal',
    'modes': 'both',
    'server_reticle': NATIVE,
    'mark': 'chevron_thin',
    'mark_size': 32,
    'mark_color': 'orange',
    'mark_outline': True,
    'mark_hides_centre': True,
    'reload_box': True,
    'reload_arcs': False,
    'repair_timers': True,
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
}

LIMITS = {'mark_size': (16, 128), 'x': (-200, 200), 'y': (-200, 200)}
