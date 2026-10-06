from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.native_settings import NATIVE, TRI_STATE
from ..model.constants import DRUM_BARS, DRUM_OFF, DRUM_SHELLS, MARK_COLORS, VECTOR_MARKS

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
DRUM_STYLES = (DRUM_SHELLS, DRUM_BARS, DRUM_OFF)

# preset: the recommended client value (core.client.native.ClientDefaults), the game's own reticle without the grid.
# mark: the game's own centre; a centre mark is a reticle pack the player picks, no pack replaces the stock centre by
# default (docs/research/competitors/2026-10-05-behavior-parity.md section 2), so the chevron and the others wait in
# the gallery, each with its colour and outline below. The readouts beside the reticle show the own reload, the arcs
# are opt-in, the magazine is drawn as shell icons (docs/research/design/2026-10-05-autoloader-styles.md); the sniper
# zoom readout is on (the owner's call; it hides the stock indicator only while ours is drawn); the repair of the own
# modules stays on the stock damage panel, which every pack keeps.
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

# The smaller aim circle, a component of its own (settings PARTS) as the packs list it (LeBwa's free one):
# its switch in config.json, its section the size of the gun marker as a share of the size the client computes (model
# AIM_CIRCLE_SCALES). Off by default, as LeBwa offers it and DispersionReticle ships it (multiplier 1.0); switched on it
# starts at 70 %, between DispersionReticle's measured 0.58 and the old mod_sfgm's 0.7.
CIRCLE_PANEL_ID = 'aim_circle'
CIRCLE_SWITCH = 'battle_aim_circle'
CIRCLE_GROUP = 'battle'
CIRCLE_SIZES = ('p80', 'p70', 'p60')
CIRCLE_DEFAULTS = {'size': 'p70'}
CIRCLE_CHOICES = {'size': CIRCLE_SIZES}
