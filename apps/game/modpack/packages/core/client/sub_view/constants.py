from __future__ import absolute_import, division, print_function, unicode_literals

# A screen is a lobby sub view over the 3D hangar, the way the stock Gameface views that show a vehicle open (RU 1.45
# gui/impl/lobby/maps_training/maps_training_base_view.py, early_access_vehicle_view.py: ViewFlags.LOBBY_SUB_VIEW,
# ScopeTemplates.LOBBY_SUB_SCOPE, app.setBackgroundAlpha(0), the lobby header menu hidden): the stock hangar UI steps
# aside and the page's drags and wheel turn the hangar camera (CameraRelatedEvents.LOBBY_VIEW_MOUSE_MOVE). poliroid
# BattleHits opens a LobbySubView with __background_alpha__ 0 the same way.
BACKGROUND_ALPHA = 0.0
MODEL_CLASS_NAME = 'OtmetkiSubViewModel'
