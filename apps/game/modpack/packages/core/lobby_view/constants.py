from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: the stock hangar's vehicle markers hide while any window of these wulf layers is open, other
# than the hangar itself and a pop-over (gui/Scaleform/daapi/view/lobby/lobby_vehicle_marker_view.py,
# LobbyVehicleMarkerView.__LAYERS_WITHOUT_MARKERS and _canShowMarkers). The battle queue (VIEW_ALIAS.BATTLE_QUEUE),
# the store, research, profile, barracks and the prebattle rooms replace the hangar in the SUB_VIEW layer; the settings
# window, rewards and full-screen Gameface views open in FULLSCREEN_WINDOW, OVERLAY or TOP_SUB_VIEW.
BLOCKING_LAYERS = ('SUB_VIEW', 'TOP_SUB_VIEW', 'FULLSCREEN_WINDOW', 'OVERLAY')
# gui/Scaleform/daapi/settings/views.py VIEW_ALIAS.LOBBY_HANGAR
HANGAR_ALIAS = 'hangar'
# frameworks/wulf/gui_constants.WindowStatus names of a window that is on its way out.
GONE_STATUSES = ('DESTROYING', 'DESTROYED')
# gui/game_control/overlay.py _LAYERS: what the client hides to show the bare hangar (UNVERIFIED on Lesta 1.45 for the
# Gameface parts of the hangar).
HIDDEN_LAYERS = ('MARKER', 'VIEW', 'WINDOW', 'WAITING', 'SYSTEM_MESSAGE', 'FULLSCREEN_WINDOW')
