from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 common/BattleFeedbackCommon.BATTLE_EVENT_TYPE: the own feedback's damage, dealt (the target id is the enemy)
# and received (the target id is the attacker).
SIDE_BY_EVENT = (('DAMAGE', 'dealt'), ('RECEIVED_DAMAGE', 'received'))

# The viewer page, registered by the ui package's res_map (packages/ui/res_map) next to the settings window and the HUD,
# loaded as a lobby sub view over the 3D hangar (core.client.sub_view).
RES_MAP_ID = 'otmetki/ui/hit_viewer'
STATE_PROPERTY = 'state'

# How long the camera flies to a hit and how long after the pose it starts (the posed nodes move on the next frames).
FOCUS_S = 0.5
FOCUS_DELAY_S = 0.1
# A loaded hangar vehicle may get its collision a few frames late (BattleHits HangarScene.__updateOutRicochet waits
# for it the same way): the hits are placed and measured again this often, this many times, before the viewer gives up.
SETTLE_S = 0.1
SETTLE_ATTEMPTS = 20
EMPTY_SELECTION = {'battle': None, 'tab': None, 'index': None}
# A page message the viewer did not understand is logged up to this long.
LOGGED_MESSAGE_CHARS = 200
# BattleHits HangarScene.__updateCamera: the camera orbits the hit point at 2.9-9 m, looking along the shell's path.
FOCUS_DISTANCE_M = 5.5
FOCUS_LIMITS_M = (2.9, 9.0)
# The plate probe reaches this far on both sides of the hit point, in metres.
PROBE_M = 0.6

# vehicle_systems.tankStructure: TankPartNames.TURRET and TankNodeNames.GUN_INCLINATION, the nodes BattleHits poses.
TURRET_NODE = 'turret'
GUN_NODE = 'Gun'

# poliroid BattleHits (gui/battlehits/hooks.py): its own ModsList entry in the hangar, greyed out while in a battle
# queue. The icon is the ui package's (the window this one opens over ships with it); ModsList draws its own without it.
MODS_LIST_ID = 'otmetki_hit_viewer'
MODS_LIST_ICON = 'gui/gameface/mods/triotmetki/ui/icon.png'
