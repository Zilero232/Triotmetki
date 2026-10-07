from __future__ import absolute_import, division, print_function, unicode_literals

SECTION = 'settings_window'
DEFAULTS = {
    'placed': False,
    'x': 0,
    'y': 0,
    'width': 0,
    'height': 0,
    'zoom': 100,
}
LIMITS = {
    'x': (-8000, 8000),
    'y': (-8000, 8000),
    'width': (0, 8000),
    'height': (0, 8000),
    'zoom': (50, 200),
}
NUMBERS = ('x', 'y', 'width', 'height', 'zoom')
