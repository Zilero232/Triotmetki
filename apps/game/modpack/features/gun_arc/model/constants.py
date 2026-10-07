# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

KIND = 'gun_arc'

MARKERS = ('corner', 'brackets', 'big_semicircle', 'semicircle', 'octagon')
CENTRE_NONE = 'none'
CENTRE_MARKERS = (CENTRE_NONE, 'line', 'dot', 'triangle', 'octagon')
MARK_NAMES = ('left', 'right', 'centre')

TICK_S = 0.05
FAST_TICK_S = 0.0
MIN_DISTANCE_M = 50.0
CANVAS = (1280, 480)

PREVIEW_SIZE = (320, 40)
PREVIEW_MARKS = {'left': (-212, 2), 'right': (148, -2), 'centre': (-32, 0)}

NO_LIMITS = 'the gun has no traverse limits (a full turret)'

EDITOR_GROUPS = (
    ('markers', ('marker', 'centre_marker')),
)
