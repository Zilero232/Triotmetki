# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_DOWN, COLOR_NEUTRAL, COLOR_WARN

BAR_CELLS = 15
BAR_TRACK = u'─'
BAR_MARK = u'●'
BAR_LEFT = u'├'
BAR_RIGHT = u'┤'
ARROW_LEFT = u'◄'
ARROW_RIGHT = u'►'
# Under half a degree left reads as the limit reached.
LIMIT_REACHED_DEG = 0.5
# A side's tone (the widget's tone names) and its colour in the text panel.
TONE_COLORS = {'bad': COLOR_DOWN, 'warning': COLOR_WARN, 'text': COLOR_NEUTRAL}
# The own turret turns smoothly; ten reads a second are enough for a readout and cost nothing.
TICK_S = 0.1

PREVIEW_SIZE = (260, 30)
PREVIEW_LIMITS = (-0.35, 0.35)
PREVIEW_YAW = 0.28

KIND = 'gun_arc'
DEGREES = u'%d°'
# The own turret's yaw from the hull axis, signed (UNVERIFIED on Lesta 1.45: a negative yaw is to the left).
YAW_DEGREES = u'%+d°'
ZERO_YAW = u'0°'

# Where the scale sits: under the reticle wherever the camera puts it, or at the panel's own place.
PLACEMENT_RETICLE = 'reticle'
PLACEMENT_FIXED = 'fixed'
PLACEMENTS = (PLACEMENT_RETICLE, PLACEMENT_FIXED)
# CROSSHAIR_VIEW_ID (RU 1.45 client source, gui/battle_control/battle_constants): arcade 1, sniper 2, strategic 3 (the
# SPG's top view); the settings key of the scale's offset under the reticle in each. Other views hide nothing and
# leave the panel where it was.
VIEW_OFFSETS = {1: 'arcade_offset', 2: 'sniper_offset', 3: 'strategic_offset'}

# The HUD report's reason while the panel has nothing to draw: the gun turns with a full turret (no yaw limits).
NO_LIMITS = 'the gun has no traverse limits (a full turret)'

# The settings window editor: field groups (spec 2026-09-30 section 12.3).
EDITOR_GROUPS = (
    ('scale', ('show_bar', 'show_degrees', 'show_yaw')),
)
