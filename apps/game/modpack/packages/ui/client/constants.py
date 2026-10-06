from __future__ import absolute_import, division, print_function, unicode_literals

MODS_LIST_ID = 'otmetki'
# The ModsList calls that put the entry's badge on and take it off, by the wanted state. UNVERIFIED on ModsList 1.6.01:
# read from its current source (1.8.0, gui/modsListApi/controller.py), so a release without them leaves the entry as is.
MODS_LIST_ALERT_CALLS = {True: 'alertModification', False: 'clearModificationAlert'}
ICON_PATH = 'gui/gameface/mods/triotmetki/ui/icon.png'
BROWSER_OPENERS = ('openWebBrowser', 'wg_openWebBrowser')

# The companion config.json key of the panel edit modifier (core.hud.modifier modes).
MODIFIER_KEY = 'hud_modifier'
