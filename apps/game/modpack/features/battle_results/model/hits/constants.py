# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

BOOK_FILE = 'battle_hits_%d.json'
MAX_HITS = 80
MAX_DETAIL_HITS = 20
SEPARATOR = u' · '
MINUS = u'−'

PART_ORDER = ('hull', 'turret', 'gun', 'chassis')
SIDED_PARTS = ('hull', 'turret')
SIDES = ('front', 'left', 'right', 'rear')
AXES = ('x', 'y', 'z')
MIDDLE = 0.5
FRONT_Z = 0.7
REAR_Z = 0.3

FIGURE = {
    'chassis_left': (0.06, 0.06, 0.14, 0.88),
    'chassis_right': (0.8, 0.06, 0.14, 0.88),
    'hull': (0.2, 0.1, 0.6, 0.82),
    'turret': (0.32, 0.36, 0.36, 0.34),
    'gun': (0.47, 0.0, 0.06, 0.36),
}
FIGURE_ORDER = ('chassis_left', 'chassis_right', 'hull', 'turret', 'gun')
SHAPE_KEYS = ('x', 'y', 'w', 'h')
