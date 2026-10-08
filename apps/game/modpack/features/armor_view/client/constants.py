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

# Its own ModsList entry, as hit_viewer has; the icon is the ui package's.
MODS_LIST_ID = 'otmetki_armor_view'
MODS_LIST_ICON = 'gui/gameface/mods/triotmetki/ui/icon.png'
