# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

# Client setting names, RU 1.45 client source (settings_constants.AIM.ARCADE / SNIPER, GAME.ENABLE_SERVER_AIM;
# SettingsCore options.AimSetting).
# Each reticle is a dict of the parts the game's own "Reticle" settings tab shows: an opacity (0-100) or a
# style index per part. A preset only sets those parts; the rest of the dict is kept as the player had it.
ARCADE = 'arcade'
SNIPER = 'sniper'
SERVER_RETICLE = 'useServerAim'

PRESET_PARTS = {
    'classic': {
        'net': 100,
        'netType': 0,
        'centralTag': 100,
        'centralTagType': 0,
        'mixing': 100,
        'mixingType': 0,
        'gunTag': 100,
        'gunTagType': 0,
        'reloader': 100,
        'reloaderTimer': 100,
        'condition': 100,
        'cassette': 100,
        'zoomIndicator': 100,
    },
    'minimal': {
        'net': 0,
        'centralTag': 100,
        'centralTagType': 0,
        'mixing': 60,
        'gunTag': 100,
        'reloader': 60,
        'reloaderTimer': 100,
        'condition': 0,
        'cassette': 100,
        'zoomIndicator': 0,
    },
    'contrast': {
        'net': 100,
        'netType': 1,
        'centralTag': 100,
        'centralTagType': 4,
        'mixing': 100,
        'mixingType': 2,
        'gunTag': 100,
        'gunTagType': 3,
        'reloader': 100,
        'reloaderTimer': 100,
        'condition': 100,
        'cassette': 100,
        'zoomIndicator': 100,
    },
    'clean': {
        'net': 0,
        'centralTag': 0,
        'mixing': 100,
        'gunTag': 100,
        'reloader': 100,
        'reloaderTimer': 100,
        'condition': 0,
        'cassette': 100,
        'zoomIndicator': 0,
    },
}

MODE_RETICLES = {
    'both': (ARCADE, SNIPER),
    'arcade': (ARCADE,),
    'sniper': (SNIPER,),
}

# The mark images the package ships (assets/assets.json: otmetki_crosshair, otmetki_crosshair_vector,
# kenney_crosshair_pack), as the client reads them through Scaleform `img://`. A full-colour mark is rendered at every
# size of MARK_RENDITIONS; a VECTOR_FOLDER mark at VECTOR_RENDITIONS in every colour of MARK_COLORS, plain and with
# its dark outline (`<stem>[_o]_<colour>_<size>.png`). The Gameface page draws a vector mark itself (ui-web
# crosshair `reticle-mark`, the same geometry the PNG sources are written from), so the PNGs serve the GUIFlash
# fallback and the editor thumbnails.
VECTOR_FOLDER = 'vector'
OUTLINE_SUFFIX = '_o'
MARK_COLORS = ('white', 'orange', 'lime', 'green', 'yellow', 'cyan', 'magenta', 'red')
DEFAULT_MARK_COLOR = 'white'
MARK_ROOT = 'gui/maps/icons/otmetki/crosshair'
MARK_RENDITIONS = (64, 128)
VECTOR_RENDITIONS = (64,)
VECTOR_MARKS = (
    'chevron_thin',
    'chevron',
    'chevron_bold',
    'chevron_small',
    'chevron_down',
    'cross',
    'cross_small',
    'cross_gap',
    'arrow',
    'dot',
    'dot_small',
    'ring',
    'ring_filled',
    'angles',
    'parens',
    'brackets',
    'corners',
    'x',
    'diamond',
)
MARK_FILES = dict(
    [(mark, (VECTOR_FOLDER, mark)) for mark in VECTOR_MARKS]
    + [
        ('colorblind', ('otmetki', 'colorblind')),
        ('triad', ('otmetki', 'triad')),
        ('arcs', ('otmetki', 'arcs')),
        ('stack', ('otmetki', 'stack')),
        ('kenney_cluster', ('kenney', 'crosshair-021')),
        ('kenney_arrows', ('kenney', 'crosshair-113')),
        ('kenney_scope', ('kenney', 'crosshair-196')),
    ]
)
# Marks of earlier versions the vector set replaced, read as the nearest new mark (settings normalizer).
RETIRED_MARKS = {
    'aim_box': 'corners',
    'streamer': 'cross_gap',
    'tint_dot': 'dot',
    'tint_cross': 'cross',
    'tint_ring': 'ring',
    'tint_brackets': 'brackets',
    'tint_diamond': 'diamond',
    'kenney_dotted': 'cross_gap',
    'kenney_pincer': 'angles',
}
CENTRE_PART = 'centralTag'
# The share of the client's gun marker size each aim circle choice draws, in percent. The packs' reduced circle sits at
# 0.6-0.8 of the stock one (DispersionReticle's measured 0.58, the old mod_sfgm curSize 0.6 or 0.7).
AIM_CIRCLE_SCALES = {'stock': 100, 'p80': 80, 'p70': 70, 'p60': 60}
PERCENT = 100.0
PREVIEW_SIZE = (128, 128)
# The preview widget: a sketch of the game's own reticle with the chosen centre mark over it (ui-web crosshair).
KIND = 'crosshair'
# The settings window's crosshair editor (ui-web component-card editor): its control groups in order, the size of the
# gallery thumbnails (the 64 px rendition) and the swatch of each colour (the vector renditions' colours, assets.json).
EDITOR_GROUPS = (
    ('shape', ('mark',)),
    ('colour', ('mark_color', 'mark_outline')),
    ('size', ('mark_size', 'mark_hides_centre')),
    ('readouts', ('reload_box', 'drum_style', 'reload_arcs', 'show_zoom')),
    ('reticle', ('preset', 'modes', 'server_reticle', 'aim_circle')),
)
EDITOR_GALLERY_KEY = 'mark'
EDITOR_SWATCH_KEY = 'mark_color'
THUMB_SIZE = 64
MARK_SWATCHES = {
    'white': '#f2f2f3',
    'orange': '#ff8a2a',
    'lime': '#b4f03c',
    'green': '#7cd35b',
    'yellow': '#ffd23f',
    'cyan': '#40c8ff',
    'magenta': '#ff3df2',
    'red': '#ff4a3d',
}
# The readouts beside the reticle (ui-web crosshair widget, docs/research/design/2026-10-03-competitor-ui.md B.2.13):
# the own gun's reload and the own HP, counted down every READOUT_TICK_S between the client's updates. A reload of -1
# is the client's "no shells" (ammo_ctrl.preprocessGunReloadTime, RU 1.45 client source). The last FINAL_S of a reload
# take the index colour; a finished reload shows «ready» for READY_HOLD_S, then the full reload time while the gun is
# loaded, as the stock reload timer does, so the box never leaves the screen. A magazine goes with its real size up to
# MAX_CLIP_SIZE (an autocannon's belt); the page decides how many rounds it draws one by one
# (docs/research/design/2026-10-05-autoloader-styles.md). Its shell is the current one's kind as `core.shells` codes;
# a kind without its own icon (smoke, flame) draws the plain shell.
READOUT_TICK_S = 0.1
NO_SHELLS = -1
FINAL_S = 1.0
READY_HOLD_S = 1.0
MAX_CLIP_SIZE = 99
SHELL_ICONS = ('ap', 'apcr', 'heat', 'he')
# The magazine style an auto-reloader's box takes when the player left the magazine to the stock reticle.
AUTOLOADER_DRUM_STYLE = 'shells'
# The sample the settings previews show: an autoloader between shots, 1.8 s left of a 2.5 s interval, 4 of 6 APCR
# shells in the drum and 24.6 s for the whole drum, 65 % HP, the sniper reticle at x8.
SAMPLE_READOUTS = {
    'reload_left': 1.8,
    'reload_base': 2.5,
    'clip': (6, 4, 'apcr', False),
    'drum_reload': 24.6,
    'health': 650,
    'max_health': 1000,
    'zoom': 8.0,
}
