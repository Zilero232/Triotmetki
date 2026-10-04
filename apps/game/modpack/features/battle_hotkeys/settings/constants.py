from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import HOTKEY_CHOICES

SWITCH = 'battle_hotkeys'
PANEL_ID = 'battle_hotkeys'
GROUP = 'battle'

# The notice sits over the reticle, where the eye is when the key is pressed, under the sixth sense lamp.
DEFAULTS = {
    'x': 0,
    'y': -110,
    'align_x': 'center',
    'align_y': 'center',
    'server_aim_key': 'ctrl_shift_j',
    'zoom_key': 'ctrl_shift_k',
}
CHOICES = {'server_aim_key': HOTKEY_CHOICES, 'zoom_key': HOTKEY_CHOICES}
# The default places of older versions (x, y, align_x, align_y): a panel still at one moves to today's default.
RETIRED_PLACES = ((0, -150, 'center', 'center'),)
# Deleted settings, fixed at their old defaults (spec 2026-09-30 section 12).
FIXED = {'notice_s': 2}
