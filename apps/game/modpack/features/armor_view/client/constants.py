from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 lobby/hangar/hangar_cm_handlers: the carousels' vehicle menu (CONTEXT_MENU_HANDLER_TYPE.VEHICLE).
MENU_MODULE = 'gui.Scaleform.daapi.view.lobby.hangar.hangar_cm_handlers'
MENU_CLASS = 'VehicleContextMenuHandler'

# RU 1.45 links_handlers/external.py: the external browser. The client's own browser (MTWebBrowser) answers the site
# with HTTP 418 (python.log 2026-10-08), so the site opens only outside the game.
BROWSER_OPENERS = ('openWebBrowser', 'wg_openWebBrowser')

PREVIEW_MODULE = 'CurrentVehicle'
PREVIEW_NAME = 'g_currentPreviewVehicle'

# Its own ModsList entry, as hit_viewer has; the icon is the ui package's.
MODS_LIST_ID = 'otmetki_armor_view'
MODS_LIST_ICON = 'gui/gameface/mods/triotmetki/ui/icon.png'

# The screen's page, registered by the ui package's res_map next to the hit viewer, and its view model's string
# properties: the page state, the armour map cells, the card under the cursor and the build status, each pushed only
# when it changes, so a hover never sends the cells again; and a count of Esc presses the page answers (its own open
# list first, else it asks to close), as the settings window does.
RES_MAP_ID = 'otmetki/ui/armor_view'
STATE_PROPERTY = 'state'
MAP_PROPERTY = 'map'
HOVER_PROPERTY = 'hover'
STATUS_PROPERTY = 'status'
ESCAPE_PROPERTY = 'escape'
PAGE_PROPERTIES = (STATE_PROPERTY, MAP_PROPERTY, HOVER_PROPERTY, STATUS_PROPERTY, ESCAPE_PROPERTY)
EMPTY_JSON = 'null'

# Rays are cast on every frame within this budget so the hangar keeps its frame rate.
TICK_S = 0.0
MAX_RAYS_PER_TICK = 400
TICK_BUDGET_S = 0.004
RAY_CHUNK = 16
# The camera has to stand still this long before the map is built again.
SETTLE_S = 0.15
# The hangar vehicle may answer rays a few frames after it reports itself loaded (python.log 2026-10-05).
EMPTY_RETRY_S = 0.2
EMPTY_RETRIES = 10
# A page message the screen did not understand is logged up to this long.
LOGGED_MESSAGE_CHARS = 200

# The hull's box (CompoundModel.getBoundsForPart(1) maps the unit cube onto it, RU 1.45
# HangarVehicleAppearance.getCentralPointForArea reads its centre at (0.5, 0.5, 0.5)) gives the point the camera orbits
# and the tank's size.
HULL_PART = 1
CENTRE = (0.5, 0.5, 0.5)
NEAR_CORNER = (0.0, 0.0, 0.0)
FAR_CORNER = (1.0, 1.0, 1.0)
