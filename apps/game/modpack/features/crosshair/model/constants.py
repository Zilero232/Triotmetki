# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: settings_constants.AIM.ARCADE / SNIPER, GAME.ENABLE_SERVER_AIM, AimSetting.
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
AIM_CIRCLE_SCALES = {'stock': 100, 'p80': 80, 'p70': 70, 'p60': 60}
PERCENT = 100.0
CIRCLE_STOCK = 'stock'
CIRCLE_CHOSEN = 'chosen'
CIRCLE_EDITOR_GROUPS = (('size', ('size',)),)
CIRCLE_SAMPLE_MARK_SIZE = 32
PREVIEW_SIZE = (128, 128)
KIND = 'crosshair'
EDITOR_GROUPS = (
    ('shape', ('mark',)),
    ('colour', ('mark_color', 'mark_outline')),
    ('size', ('mark_size', 'mark_hides_centre')),
    ('readouts', ('reload_box', 'drum_style', 'reload_arcs', 'show_zoom')),
    ('reticle', ('preset', 'modes', 'server_reticle')),
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
# RU 1.45 client source: ammo_ctrl.preprocessGunReloadTime gives -1 for no shells.
READOUT_TICK_S = 0.1
NO_SHELLS = -1
FINAL_S = 1.0
READY_HOLD_S = 1.0
MAX_CLIP_SIZE = 99
SHELL_ICONS = ('ap', 'apcr', 'heat', 'he')
DRUM_SHELLS = 'shells'
DRUM_BARS = 'bars'
DRUM_OFF = 'off'
AUTOLOADER_DRUM_STYLE = DRUM_SHELLS
RELOAD_EMPTY = 'empty'
RELOAD_READY = 'ready'
RELOAD_LOADED = 'loaded'
RELOAD_RELOADING = 'reloading'
RELOAD_FINAL = 'final'
COUNTING_STATES = (RELOAD_RELOADING, RELOAD_FINAL)
NO_RELOAD_VALUE = u'—'
READY_KEY = 'crosshair_ready'
READOUT_SWITCHES = ('reload_box', 'reload_arcs', 'show_zoom')
SAMPLE_READOUTS = {
    'reload_left': 1.8,
    'reload_base': 2.5,
    'clip': (6, 4, 'apcr', False),
    'drum_reload': 24.6,
    'interval': 2.5,
    'health': 650,
    'max_health': 1000,
    'zoom': 8.0,
}
