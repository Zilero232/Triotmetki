from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import HOTKEY_CHOICES

SWITCH = 'battle_hotkeys'
PANEL_ID = 'battle_hotkeys'
GROUP = 'battle'

DEFAULTS = {
    'x': 0,
    'y': -110,
    'align_x': 'center',
    'align_y': 'center',
    'server_aim_key': 'ctrl_shift_j',
    'zoom_key': 'ctrl_shift_k',
}
CHOICES = {'server_aim_key': HOTKEY_CHOICES, 'zoom_key': HOTKEY_CHOICES}
RETIRED_PLACES = ((0, -150, 'center', 'center'),)
FIXED = {'notice_s': 2}
