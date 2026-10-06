from __future__ import absolute_import, division, print_function, unicode_literals

import math

# A hit point in the vehicle's own coordinates, built from the vehicle descriptor's part offsets and the recorded turret
# yaw and gun pitch, the way poliroid BattleHits (Vehicle.__updateComponents, partWorldMatrix) places it: never from
# the hangar model's nodes, which a vehicle swap destroys (python.log 2026-10-06: "Usage of dangling
# PyModelNodeAdapter", the shell left at the world origin and the camera aimed at the floor). The rotations follow
# BigWorld's Matrix.setRotateYPR: a yaw turns +z towards +x, a positive pitch tips +z down.
NO_AIM = (0.0, 0.0)


def rotate(vector, yaw, pitch):
    x, y, z = vector
    y, z = y * math.cos(pitch) - z * math.sin(pitch), y * math.sin(pitch) + z * math.cos(pitch)
    x, z = x * math.cos(yaw) + z * math.sin(yaw), z * math.cos(yaw) - x * math.sin(yaw)
    return x, y, z


def _add(first, second):
    return tuple(a + b for a, b in zip(first, second))


def vehicle_vector(part, vector, offsets, aim=None, is_point=True):
    """`vector` of the part `part` ('chassis', 'hull', 'turret', 'gun') in the vehicle's coordinates; `offsets` holds
    the descriptor's 'hull' (chassis.hullPosition), 'turret' (hull.turretPositions[0]) and 'gun' (turret.gunPosition)
    positions, `aim` the turret yaw and gun pitch; a direction (`is_point` False) only turns."""
    yaw, pitch = aim or NO_AIM
    shift = (lambda base, value: _add(base, value)) if is_point else (lambda base, value: value)
    if part == 'chassis':
        return tuple(vector)
    if part == 'hull':
        return shift(offsets['hull'], vector)
    turret_base = _add(offsets['hull'], offsets['turret'])
    if part == 'gun':
        vector = shift(offsets['gun'], rotate(vector, 0.0, pitch))
    return shift(turret_base, rotate(vector, yaw, 0.0))
