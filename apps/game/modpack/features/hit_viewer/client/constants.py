from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 common/BattleFeedbackCommon.BATTLE_EVENT_TYPE: the own feedback's damage, dealt (the target id is the enemy)
# and received (the target id is the attacker).
SIDE_BY_EVENT = (('DAMAGE', 'dealt'), ('RECEIVED_DAMAGE', 'received'))

# The viewer page, registered by the ui package's res_map (packages/ui/res_map) next to the settings window and the HUD.
RES_MAP_ID = 'otmetki/ui/hit_viewer'
INVALID_RES_ID = -1
STATE_PROPERTY = 'state'
# The markers ride in the property the ui-web bridge already reads as `feed` (shared/api/gameface), pushed every frame
# apart from the slower state.
MARKS_PROPERTY = 'feed'
SEND_COMMAND = 'send'
MESSAGE_ARG = 'message'
# The viewer is a lobby sub view over the 3D hangar, the way the stock Gameface views that show a vehicle open (RU 1.45
# gui/impl/lobby/maps_training/maps_training_base_view.py, early_access_vehicle_view.py: ViewFlags.LOBBY_SUB_VIEW,
# ScopeTemplates.LOBBY_SUB_SCOPE, app.setBackgroundAlpha(0), the lobby header menu hidden): the stock hangar UI steps
# aside and the page's drags and wheel turn the hangar camera (CameraRelatedEvents.LOBBY_VIEW_MOUSE_MOVE). poliroid
# BattleHits opens a LobbySubView with __background_alpha__ 0 the same way.
BACKGROUND_ALPHA = 0.0

# How often the markers follow the camera, and how long the camera flies to a hit.
TICK_S = 0.04
FOCUS_S = 0.5
RESTORE_WAIT_S = 4.0
# BattleHits HangarScene.__updateCamera: the camera orbits the hit point at 2.9-9 m, looking along the shell's path.
FOCUS_DISTANCE_M = 5.5
FOCUS_LIMITS_M = (2.9, 9.0)
# The direction line of a marker: this far back along the shell's path, in metres; the plate probe reaches this far
# on both sides of the hit point.
TAIL_M = 0.9
PROBE_M = 0.6

# RU 1.45 client source: the stock modules a vehicle descriptor is rebuilt from, the hangar services and classes.
CAMERA_MANAGER_MODULE = 'cgf_components.hangar_camera_manager'
CAMERA_MANAGER_CLASS = 'HangarCameraManager'
PREVIEW_MODULE = 'CurrentVehicle'
PREVIEW_NAME = 'g_currentPreviewVehicle'
DECODER_MODULE = 'VehicleEffects'
DECODER_CLASS = 'DamageFromShotDecoder'
PROJECTION_MODULE = 'AvatarInputHandler.cameras'
PROJECTION_FUNCTION = 'getViewProjectionMatrix'
# vehicle_systems.tankStructure.TankPartIndexes: CHASSIS 0, HULL 1, TURRET 2, GUN 3; the materials of each part.
MATERIAL_PARTS = ('chassis', 'hull', 'turret', 'gun')
LAST_STRUCTURAL_INDEX = 3
# vehicle_systems.tankStructure: TankPartNames.TURRET and TankNodeNames.GUN_INCLINATION, the nodes BattleHits poses.
TURRET_NODE = 'turret'
GUN_NODE = 'Gun'

# poliroid BattleHits (gui/battlehits/hooks.py): its own ModsList entry in the hangar, greyed out while in a battle
# queue. The icon is the ui package's (the window this one opens over ships with it); ModsList draws its own without it.
MODS_LIST_ID = 'otmetki_hit_viewer'
MODS_LIST_ICON = 'gui/gameface/mods/triotmetki/ui/icon.png'
