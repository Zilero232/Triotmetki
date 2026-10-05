# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

# The game's own options (RU 1.45 client source: settings_constants.GAME.ENABLE_SERVER_AIM, GAME.INCREASED_ZOOM), both
# on/off switches of the «Игра» tab. The rotator and the sniper camera follow their change at once
# (VehicleGunRotator.applySettings, SniperCamera's onSettingsChanged).
SERVER_AIM = 'useServerAim'
INCREASED_ZOOM = 'increasedZoom'
# settings key of each option's hotkey choice -> the option it toggles.
TOGGLES = (
    ('server_aim_key', SERVER_AIM),
    ('zoom_key', INCREASED_ZOOM),
)

# The hotkey choices: (Keys name, held modifiers). Ctrl+Shift with a letter no battle command uses.
HOTKEYS = {
    'none': (None, ()),
    'ctrl_shift_j': ('KEY_J', ('KEY_LCONTROL', 'KEY_LSHIFT')),
    'ctrl_shift_k': ('KEY_K', ('KEY_LCONTROL', 'KEY_LSHIFT')),
    'ctrl_shift_n': ('KEY_N', ('KEY_LCONTROL', 'KEY_LSHIFT')),
    'ctrl_shift_m': ('KEY_M', ('KEY_LCONTROL', 'KEY_LSHIFT')),
}
HOTKEY_CHOICES = ('ctrl_shift_j', 'ctrl_shift_k', 'ctrl_shift_n', 'ctrl_shift_m', 'none')

PREVIEW_SIZE = (260, 30)
# The widget the Gameface page draws (ui-web entities/hud/option-notice).
KIND = 'option_notice'
