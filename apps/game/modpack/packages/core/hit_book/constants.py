# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

BOOK_VERSION = 1
MAX_BATTLES = 30
# The own feedback's damage and the hit's points arrive close together, in either order.
DAMAGE_WINDOW_S = 1.0

# RU 1.45 client source (vehicle_systems/tankStructure.TankPartIndexes): 0 chassis, 1 hull, 2 turret, 3 gun; higher
# indices are the chassis' track pairs and wheels (VehicleEffects.DamageFromShotDecoder.convertComponentIndex).
PART_CHASSIS = 'chassis'
PART_HULL = 'hull'
PART_TURRET = 'turret'
PART_GUN = 'gun'
PART_NAMES = (PART_CHASSIS, PART_HULL, PART_TURRET, PART_GUN)
# RU 1.45 common/constants.VEHICLE_HIT_EFFECT: 0 pierced without damage, 1-2 ricochets, 3 not pierced, 4 pierced,
# 5 critical hit, 6 pierced with a damaged device.
OUTCOME_PEN = 'pen'
OUTCOME_CRIT = 'crit'
OUTCOME_BLOCKED = 'blocked'
OUTCOME_RICOCHET = 'ricochet'
OUTCOME_NO_DAMAGE = 'nodamage'
OUTCOME_BY_CODE = {
    0: OUTCOME_NO_DAMAGE,
    1: OUTCOME_RICOCHET,
    2: OUTCOME_RICOCHET,
    3: OUTCOME_BLOCKED,
    4: OUTCOME_PEN,
    5: OUTCOME_CRIT,
    6: OUTCOME_CRIT,
}
OUTCOMES = (OUTCOME_PEN, OUTCOME_CRIT, OUTCOME_BLOCKED, OUTCOME_RICOCHET, OUTCOME_NO_DAMAGE)
DAMAGING = (OUTCOME_PEN, OUTCOME_CRIT)
