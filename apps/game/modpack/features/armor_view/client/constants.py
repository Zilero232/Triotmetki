from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 lobby/hangar/hangar_cm_handlers: the carousels' vehicle menu (CONTEXT_MENU_HANDLER_TYPE.VEHICLE).
MENU_MODULE = 'gui.Scaleform.daapi.view.lobby.hangar.hangar_cm_handlers'
MENU_CLASS = 'VehicleContextMenuHandler'

# RU 1.45 showBrowserOverlayView(url, alias=BROWSER_LOBBY_TOP_SUB): unlike BrowserController.load, no client params.
DISPATCHER_MODULE = 'gui.shared.event_dispatcher'
OVERLAY_NAME = 'showBrowserOverlayView'
# RU 1.45 links_handlers/external.py: the external browser.
BROWSER_OPENERS = ('openWebBrowser', 'wg_openWebBrowser')

PREVIEW_MODULE = 'CurrentVehicle'
PREVIEW_NAME = 'g_currentPreviewVehicle'
CURRENT_NAME = 'g_currentVehicle'

# Its own ModsList entry, as hit_viewer has; the icon is the ui package's.
MODS_LIST_ID = 'otmetki_armor_view'
MODS_LIST_ICON = 'gui/gameface/mods/triotmetki/ui/icon.png'

# The in-hangar armour map: one panel with the cells over the whole screen (never moved: a drag puts it back), one
# with the legend and the hover card, which the player may move like any hangar label.
MAP_PANEL = 'otmetki.armor_view.map'
LEGEND_PANEL = 'otmetki.armor_view.legend'
MAP_LAYOUT = {'x': 0, 'y': 0, 'alignX': 'left', 'alignY': 'top', 'scale': 1.0}
LEGEND_LAYOUT = {'x': 24, 'y': 0, 'alignX': 'left', 'alignY': 'center', 'scale': 1.0}

# The map casts rays on every frame (BigWorld.callback(0)) within this budget, so the hangar keeps its frame rate;
# the time is checked after every chunk of rays. The live log's timing line (python.log `armor view: N rays in X ms
# over K ticks`) is what tunes these and the detail levels.
TICK_S = 0.0
MAX_RAYS_PER_TICK = 400
TICK_BUDGET_S = 0.004
RAY_CHUNK = 16
# The camera has to stand still this long before the map is built again.
SETTLE_S = 0.15
# The hangar vehicle may answer rays a few frames after it reports itself loaded (hit_viewer's settle, python.log
# 2026-10-05): a coarse level without any armour is cast again this often, this many times.
EMPTY_RETRY_S = 0.2
EMPTY_RETRIES = 10
PROGRESS_STEPS = 20
