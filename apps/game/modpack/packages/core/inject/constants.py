from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source (AS3, gui_base): net/wg/gui/components/containers/inject/GFInjectComponent.as, the stock
# Scaleform container the client draws a Gameface ViewImpl into (InjectComponent + wulf ChildViewProxy, the crew panel
# in the hangar, the context hints in battle). gui_base is loaded by the lobby and the battle app alike, so the class
# is found by its qualified name through the app's own ClassFactory (base_app ClassFactory.getObject).
GF_INJECT_CLASS = 'net.wg.gui.components.containers.inject.GFInjectComponent'

# The view model of our Gameface pages (the settings window, hud.html, viewer.html): one JSON string property, one
# command the page sends its messages through as {message}.
PAGE_STATE_PROPERTY = 'state'
PAGE_SEND_COMMAND = 'send'
PAGE_MESSAGE_ARG = 'message'

# gui.impl.gen_utils.INVALID_RES_ID (RU 1.45 client source): openwg_gameface.res_id_by_key for an unknown or not yet
# validated res_map key.
INVALID_RES_ID = -1

# The HUD page inside the Scaleform hangar view (docs/specs/2026-10-06-gameface-inject-host.md, phase 1): the lobby's
# renderer of core/client/hud, ahead of the HUD window, switched by `hud_inject` in config.json (on by default).
# gui/app_loader/settings.py APP_NAME_SPACE names (RU 1.45 client source) of the Scaleform apps a page goes into.
LOBBY_APP = 'SF_LOBBY'
BATTLE_APP = 'SF_BATTLE'
HUD_INJECT_ALIAS = 'otmetkiHudInject'
HUD_INJECT_KEY = 'hud_inject'
# A page placed in the hangar view that has not loaded this long after is given up for the session, and the hangar
# panels go back to the HUD window. The spike's page loaded within a frame on RU 1.45.
HUD_INJECT_LOAD_TIMEOUT_S = 10.0

# The dev-only spike (docs/specs/2026-10-06-gameface-inject-host.md): the hud.html page, already registered in the
# ui package's res_map, drawn inside the Scaleform hangar view. It runs only in a dev install (README "Dev loop") with
# OTMETKI_INJECT_SPIKE=1 in the environment or the flag file next to the other settings files.
SPIKE_ALIAS = 'otmetkiInjectSpike'
SPIKE_PAGE = 'otmetki/ui/hud'
SPIKE_ENV = 'OTMETKI_INJECT_SPIKE'
SPIKE_ENV_ON = '1'
SPIKE_FLAG = 'mods/configs/otmetki/inject_spike.flag'
SPIKE_LABEL = 'otmetki.inject_spike'
SPIKE_TICK_S = 1.0
SPIKE_LABEL_PROPS = {'x': 40, 'y': 160, 'alignX': 'left', 'alignY': 'top', 'drag': True}
SPIKE_TEXT = 'Tri otmetki inject spike | %s | %s'
SPIKE_CLOCK = '%H:%M:%S'
# Ctrl+Alt+I cycles the input modes: Keys names (RU 1.45 client source, Keys.py).
SPIKE_HOTKEY = ('KEY_I', ('KEY_LCONTROL', 'KEY_LALT'))

# The spike's input modes: whether the page is told it is in edit mode (it then takes the mouse over its whole input
# area, ui-web views/hud use-input-area) and whether the Scaleform side lets the mouse reach the injected view at all
# (InteractiveObject.mouseChildren of the GFInjectComponent).
SPIKE_MODES = (
    ('view', False, True),
    ('edit', True, True),
    ('locked', True, False),
)

# The dev-only battle spike: the same page inside the Scaleform battle page, below the page children that cover the HUD
# (RU 1.45 client source, AS3 gui_battle: BaseBattlePage.battleLoading, random BattlePage.fullStats and radialMenu; the
# client puts its own GF inject, battleNotifier, under radialMenu the same way, random/views/BattlePage.as:153).
BATTLE_SPIKE_ALIAS = 'otmetkiInjectBattleSpike'
BATTLE_SPIKE_LABEL = 'otmetki.inject_battle_spike'
BATTLE_SPIKE_LABEL_PROPS = {'x': 40, 'y': 240, 'alignX': 'left', 'alignY': 'top', 'drag': True}
BATTLE_SPIKE_TEXT = 'Tri otmetki battle inject spike | %s | %s'
# gui/Scaleform/daapi/settings/views.py VIEW_ALIAS (RU 1.45 client source): the battle pages of the battle types the
# HUD layouts know.
BATTLE_PAGES = (
    'classicBattlePage',
    'comp7BattlePage',
    'epicBattlePage',
    'rankedBattlePage',
    'strongholdBattlePage',
    'eventBattlePage',
)
BATTLE_COVERS = ('battleLoading', 'fullStats', 'radialMenu')
