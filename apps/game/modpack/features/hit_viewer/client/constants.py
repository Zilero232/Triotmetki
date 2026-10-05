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
# RU 1.45 frameworks/wulf/gui_constants.py: TOP_WINDOW (10) sits over the hangar's views and the HUD page's labels
# (WINDOW, 7) and under the overlays and tooltips. The window is a plain WINDOW the page sizes to the client (as the
# HUD page does); the page takes the mouse only over its own panel (setInputArea), so the hangar under the rest of the
# screen still turns and zooms the camera.
WINDOW_LAYER = 'TOP_WINDOW'

# How often the markers follow the camera, and how long the camera flies to a hit.
TICK_S = 0.04
FOCUS_S = 0.6
RESTORE_WAIT_S = 4.0
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

# poliroid BattleHits (gui/battlehits/hooks.py): its own ModsList entry in the hangar, greyed out while in a battle
# queue. The icon is the ui package's (the window this one opens over ships with it); ModsList draws its own without it.
MODS_LIST_ID = 'otmetki_hit_viewer'
MODS_LIST_ICON = 'gui/gameface/mods/triotmetki/ui/icon.png'
