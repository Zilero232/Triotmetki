# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_DOWN, COLOR_UP, COLOR_WARN

# The stock shell tooltip (RU 1.45 client source: consumables_panel TOOLTIP_FORMAT) is `{HEADER}..{/HEADER}` with an
# optional `\n/{BODY}..{/BODY}`; its body lines are joined by a line break.
BODY_OPEN = '\n/{BODY}'
BODY_CLOSE = '{/BODY}'
LINE_BREAK = '\n'

# (stats key, i18n key): the lines of a tooltip that has no body (the client's technical info is off).
FULL_LINES = (
    ('damage', 'aim_info_shell_damage'),
    ('piercing', 'aim_info_shell_piercing'),
    ('speed', 'aim_info_shell_speed'),
    ('module_damage', 'aim_info_shell_module_damage'),
)
# The line the stock body never has.
EXTRA_LINES = (('module_damage', 'aim_info_shell_module_damage'),)

PERCENT = 100.0

# The armour readout under the reticle.
KIND = 'aim_armor'
PREVIEW_SIZE = (200, 30)
# The stock verdicts of the marker colour (RU 1.45 aih_constants.SHOT_RESULT names, lower-cased): the widget tone and
# the text colour of each. UNDEFINED has no readout.
VERDICTS = ('not_pierced', 'little_pierced', 'great_pierced')
VERDICT_TONES = {'not_pierced': 'bad', 'little_pierced': 'warning', 'great_pierced': 'good'}
VERDICT_COLORS = {'bad': COLOR_DOWN, 'warning': COLOR_WARN, 'good': COLOR_UP}
# The rotator moves the marker (and the client resolves the shot) once per server tick (SERVER_TICK_LENGTH 0.1 s);
# the readout follows the first resolution of each tick.
TICK_S = 0.1
DEGREES = u'%d°'
SEPARATOR = u' · '
PREVIEW_READOUT = {
    'effective': 246,
    'nominal': 180,
    'piercing': 218,
    'angle': 43,
    'verdict': 'little_pierced',
    'ricochet': False,
}

# Where the readout sits: under the reticle wherever the camera puts it, or at the panel's own place.
PLACEMENT_RETICLE = 'reticle'
PLACEMENT_FIXED = 'fixed'
PLACEMENTS = (PLACEMENT_RETICLE, PLACEMENT_FIXED)
# CROSSHAIR_VIEW_ID (RU 1.45 client source, gui/battle_control/battle_constants): arcade 1, sniper 2, strategic 3 (the
# SPG's top view); the settings key of the readout's offset under the reticle in each. Other views leave the panel
# where it was.
VIEW_OFFSETS = {1: 'arcade_offset', 2: 'sniper_offset', 3: 'strategic_offset'}

# The HUD report's reasons while the readout shows nothing.
NO_TARGET = 'no enemy vehicle under the reticle'
NO_RESOLVER = 'the client has no shot-result resolver to read'

# The settings window editor: field groups (spec 2026-09-30 section 12.3).
EDITOR_GROUPS = (
    ('armor', ('armor_under_aim', 'show_piercing', 'show_nominal', 'show_angle')),
    ('target', ('target_distance',)),
    ('shells', ('shell_tooltips', 'aim_circle')),
)
