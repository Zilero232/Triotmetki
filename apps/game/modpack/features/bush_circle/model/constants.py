from __future__ import absolute_import, division, print_function, unicode_literals

# The game's bush rule (a bush hides a tank that fired from it beyond 15 m), not a setting.
RADIUS_M = 15.0
MODE_HOTKEY = 'hotkey'
MODE_ALWAYS = 'always'
MODES = (MODE_HOTKEY, MODE_ALWAYS)
HOTKEYS = {
    'none': (None, ()),
    'ctrl_shift_b': ('KEY_B', ('KEY_LCONTROL', 'KEY_LSHIFT')),
    'ctrl_shift_c': ('KEY_C', ('KEY_LCONTROL', 'KEY_LSHIFT')),
}
HOTKEY_CHOICES = ('ctrl_shift_b', 'ctrl_shift_c', 'none')
# RU 1.45 scripts/command_mapping.xml binds F2-F8 to the stock chat commands (CMD_CHAT_SHORTCUT_*).
RETIRED_HOTKEYS = {'f7': 'ctrl_shift_b', 'f8': 'ctrl_shift_b'}
# ARGB, the form BigWorld.PyTerrainSelectedArea.setup takes (RU 1.45 CombatSelectedArea.COLOR_WHITE).
COLORS = {
    'white': 0xFFFFFFFF,
    'green': 0xFF7CD35B,
    'yellow': 0xFFF2B25B,
    'cyan': 0xFF5BD3F2,
}
COLOR_CHOICES = ('white', 'green', 'yellow', 'cyan')
