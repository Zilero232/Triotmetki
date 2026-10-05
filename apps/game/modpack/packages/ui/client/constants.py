from __future__ import absolute_import, division, print_function, unicode_literals

MODS_LIST_ID = 'otmetki'
# The ModsList calls that put the entry's badge on and take it off, by the wanted state. UNVERIFIED on ModsList 1.6.01:
# read from its current source (1.8.0, gui/modsListApi/controller.py), so a release without them leaves the entry as is.
MODS_LIST_ALERT_CALLS = {True: 'alertModification', False: 'clearModificationAlert'}
ICON_PATH = 'gui/gameface/mods/triotmetki/ui/icon.png'
BROWSER_OPENERS = ('openWebBrowser', 'wg_openWebBrowser')

# The settings button on the Gameface HUD page: its own section of components.json, docked in the hangar's bottom
# right row, left of the messenger bar's notification, session stats and comparison buttons. RU 1.45 client source
# (sources-as3 gui_lobby MessengerBar.as): that row is Scaleform (BAR_HEIGHT 45, visible 35), laid out from
# stageWidth - 11 leftwards with a gap of 3, and the channel carousel takes the rest, so a Gameface page cannot join
# it; the button sits over the carousel's right end instead. UNVERIFIED on Lesta 1.45: the three buttons' widths.
BUTTON_ALIAS = 'otmetki.ui.button'
BUTTON_SECTION = 'hangar_button'
BUTTON_DEFAULTS = {
    'x': -176,
    'y': -4,
    'align_x': 'right',
    'align_y': 'bottom',
    'scale': 90,
}
# The top-right spot of modpack 0.1.x: a player who never moved the button gets the new spot.
BUTTON_OLD_DEFAULTS = {
    'x': -24,
    'y': 72,
    'align_x': 'right',
    'align_y': 'top',
    'scale': 100,
}
BUTTON_LAYOUT_KEYS = ('x', 'y', 'align_x', 'align_y', 'scale')

# Ctrl+Shift+T in the hangar opens the window (and ends the on-screen HUD edit mode).
HOTKEY = 'KEY_T'
HOTKEY_MODIFIERS = ('KEY_LCONTROL', 'KEY_LSHIFT')

# The companion config.json key of the panel edit modifier (core.hud.modifier modes).
MODIFIER_KEY = 'hud_modifier'
