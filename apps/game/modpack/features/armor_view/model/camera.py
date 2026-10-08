from __future__ import absolute_import, division, print_function, unicode_literals

import math

from .constants import CAMERA_FOV_RAD, CAMERA_MOVE_M, CAMERA_TURN_COS


def _dot(first, second):
    return sum(a * b for a, b in zip(first, second))


def _length(vector):
    return math.sqrt(_dot(vector, vector))


def _distance(first, second):
    offset = [a - b for a, b in zip(first, second)]
    return _length(offset)


def _cos_between(first, second):
    lengths = _length(first) * _length(second)
    if lengths <= 0:
        return 1.0
    return _dot(first, second) / lengths


def has_moved(before, after):
    if before is None or after is None:
        return True
    position, forward, fov = after
    old_position, old_forward, old_fov = before

    is_moved = _distance(old_position, position) > CAMERA_MOVE_M
    is_turned = _cos_between(old_forward, forward) < CAMERA_TURN_COS
    is_zoomed = abs(old_fov - fov) > CAMERA_FOV_RAD
    return is_moved or is_turned or is_zoomed
