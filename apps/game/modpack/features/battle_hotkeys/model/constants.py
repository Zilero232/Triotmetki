# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: settings_constants.GAME.ENABLE_SERVER_AIM, GAME.INCREASED_ZOOM.
SERVER_AIM = 'useServerAim'
INCREASED_ZOOM = 'increasedZoom'
TOGGLES = (
    ('server_aim_key', SERVER_AIM),
    ('zoom_key', INCREASED_ZOOM),
)

HOTKEYS = {
    'none': (None, ()),
    'ctrl_shift_j': ('KEY_J', ('KEY_LCONTROL', 'KEY_LSHIFT')),
    'ctrl_shift_k': ('KEY_K', ('KEY_LCONTROL', 'KEY_LSHIFT')),
    'ctrl_shift_n': ('KEY_N', ('KEY_LCONTROL', 'KEY_LSHIFT')),
    'ctrl_shift_m': ('KEY_M', ('KEY_LCONTROL', 'KEY_LSHIFT')),
}
HOTKEY_CHOICES = ('ctrl_shift_j', 'ctrl_shift_k', 'ctrl_shift_n', 'ctrl_shift_m', 'none')

PREVIEW_SIZE = (260, 30)
KIND = 'option_notice'
