# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

BOOK_VERSION = 1
MAX_BATTLES = 30
# The own feedback's damage and the hit's points arrive close together, in either order.
DAMAGE_WINDOW_S = 1.0

# RU 1.45 client source (vehicle_systems/tankStructure.TankPartIndexes): 0 chassis, 1 hull, 2 turret, 3 gun; higher
# indices are the chassis' track pairs and wheels (VehicleEffects.DamageFromShotDecoder.convertComponentIndex).
PART_NAMES = ('chassis', 'hull', 'turret', 'gun')
# RU 1.45 common/constants.VEHICLE_HIT_EFFECT: 0 pierced without damage, 1-2 ricochets, 3 not pierced, 4 pierced,
# 5 critical hit, 6 pierced with a damaged device.
OUTCOME_BY_CODE = {0: 'nodamage', 1: 'ricochet', 2: 'ricochet', 3: 'blocked', 4: 'pen', 5: 'crit', 6: 'crit'}
OUTCOMES = ('pen', 'crit', 'blocked', 'ricochet', 'nodamage')
DAMAGING = ('pen', 'crit')
