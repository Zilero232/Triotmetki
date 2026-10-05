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
# The magazine above the reload box: one shell icon per round (a count past the page's compact threshold), the
# thin cells of earlier versions, or left to the stock reticle's own indicator.
DRUM_STYLES = ('shells', 'bars', 'off')

# preset: the recommended client value (core.client.native.ClientDefaults), the game's own reticle without the grid.
# mark: the game's own centre; a centre mark is a reticle pack the player picks, no pack replaces the stock centre by
# default (docs/research/competitors/2026-10-05-behavior-parity.md section 2), so the chevron and the others wait in
# the gallery, each with its colour and outline below. The readouts beside the reticle show the own reload, the arcs
# are opt-in, the magazine is drawn as shell icons (docs/research/design/2026-10-05-autoloader-styles.md); the sniper
# zoom stays the game's own indicator unless the player asks for ours (XVM's is off by default, Battle Observer has
# none); the repair of the own modules stays on the stock damage panel, which every pack keeps.
# x/y are the mark's offset from the reticle centre, not a screen position: the mark follows the reticle,
# so it is not dragged (a drag would save a screen position).
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
    'show_zoom': False,
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
