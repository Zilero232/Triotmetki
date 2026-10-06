# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

KIND = 'gun_arc'

# «УГН» as the packs draw it: GunConstraints, the mod Lebwa's pack lists as «УГН» (its ModsSettingsAPI template in the
# player's modsettings.dat): a marker left and one right of the reticle where the gun stops at each traverse limit, in
# one of five styles, plus an optional marker in the middle of the traverse sector; both default to the first choice.
MARKERS = ('corner', 'brackets', 'big_semicircle', 'semicircle', 'octagon')
CENTRE_NONE = 'none'
CENTRE_MARKERS = (CENTRE_NONE, 'line', 'dot', 'triangle', 'octagon')
MARK_NAMES = ('left', 'right', 'centre')

# The markers follow the camera, so they are redrawn 20 times a second; GunConstraints' «Ускоренная отрисовка» (off by
# default, «может влиять на FPS») redraws them every frame.
TICK_S = 0.05
FAST_TICK_S = 0.0
# The limits are drawn at the gun marker's distance; a marker nearer than this (aimed at the ground by the tank) keeps
# them this far out (m), where the turret's offset from the hull centre no longer shows.
MIN_DISTANCE_M = 50.0
# The panel's canvas (design px, the page's GUN_ARC.canvas), centred on the reticle; a marker outside it is left out.
CANVAS = (1280, 480)

PREVIEW_SIZE = (320, 40)
PREVIEW_MARKS = {'left': (-212, 2), 'right': (148, -2), 'centre': (-32, 0)}

# The HUD report's reason while the panel has nothing to draw: the gun turns with a full turret (no yaw limits).
NO_LIMITS = 'the gun has no traverse limits (a full turret)'

# The settings window editor: field groups (spec 2026-09-30 section 12.3).
EDITOR_GROUPS = (
    ('markers', ('marker', 'centre_marker')),
)
