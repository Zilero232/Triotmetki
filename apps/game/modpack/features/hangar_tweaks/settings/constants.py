from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.native_settings import NATIVE

SWITCH = 'hangar_tweaks'
GROUP = 'hangar'

CAROUSEL_ROWS = (NATIVE, '1', '2', '3', '4', '5')
CAROUSEL_TILES = (NATIVE, 'adaptive', 'small')
INTERFACE_SCALE_CHOICES = (NATIVE, 'auto', 'x1', 'x1_25', 'x1_5', 'x1_75', 'x2')

DEFAULTS = {
    'carousel_rows': NATIVE,
    'carousel_tiles': NATIVE,
    'interface_scale': NATIVE,
    'quick_actions': True,
    'interface_scale_exact': 0,
}
LIMITS = {'interface_scale_exact': (0, 300)}

CHOICES = {
    'carousel_rows': CAROUSEL_ROWS,
    'carousel_tiles': CAROUSEL_TILES,
    'interface_scale': INTERFACE_SCALE_CHOICES,
}

ADVANCED = ('interface_scale_exact',)
