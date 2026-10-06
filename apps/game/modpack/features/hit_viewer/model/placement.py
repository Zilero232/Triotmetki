from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.hit_book import PART_CHASSIS, PART_GUN, PART_HULL, PART_TURRET
from .constants import NO_AIM

# A hit point in the vehicle's own coordinates, built from the vehicle descriptor's part offsets and the recorded turret
# yaw and gun pitch, the way poliroid BattleHits (Vehicle.__updateComponents, partWorldMatrix) places it: never from
# the hangar model's nodes, which a vehicle swap destroys (python.log 2026-10-06: "Usage of dangling
# PyModelNodeAdapter", the shell left at the world origin and the camera aimed at the floor). The rotations follow
# BigWorld's Matrix.setRotateYPR: a yaw turns +z towards +x, a positive pitch tips +z down.


def rotate(vector, yaw, pitch):
    x, y, z = vector
    y, z = y * math.cos(pitch) - z * math.sin(pitch), y * math.sin(pitch) + z * math.cos(pitch)
    x, z = x * math.cos(yaw) + z * math.sin(yaw), z * math.cos(yaw) - x * math.sin(yaw)
    return x, y, z


def _add(first, second):
    return tuple(a + b for a, b in zip(first, second))


def _turned_only(base, value):
    return value


# `offsets` are the descriptor's positions: hull (chassis.hullPosition), turret (hull.turretPositions[0]) and gun
# (turret.gunPosition). A direction (`is_point` False) only turns, it is never shifted.
def vehicle_vector(part, vector, offsets, aim=None, is_point=True):
    yaw, pitch = aim or NO_AIM
    shift = _add if is_point else _turned_only
    if part == PART_CHASSIS:
        return tuple(vector)
    if part == PART_HULL:
        return shift(offsets[PART_HULL], vector)

    turret_base = _add(offsets[PART_HULL], offsets[PART_TURRET])
    if part == PART_GUN:
        vector = shift(offsets[PART_GUN], rotate(vector, 0.0, pitch))
    return shift(turret_base, rotate(vector, yaw, 0.0))
