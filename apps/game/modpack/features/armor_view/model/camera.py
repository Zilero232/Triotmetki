from __future__ import absolute_import, division, print_function, unicode_literals

import math

from .constants import CAMERA_FOV_RAD, CAMERA_MOVE_M, CAMERA_TURN_COS


def _distance(first, second):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(first, second)))


def _cos_between(first, second):
    dot = sum(a * b for a, b in zip(first, second))
    lengths = math.sqrt(sum(a * a for a in first)) * math.sqrt(sum(b * b for b in second))
    if lengths <= 0:
        return 1.0
    return dot / lengths


def has_moved(before, after):
    """Whether the camera pose `(position, forward, fov)` moved, turned or zoomed past the map's thresholds since
    `before` (None counts as moved)."""
    if before is None or after is None:
        return True
    position, forward, fov = after
    old_position, old_forward, old_fov = before

    is_moved = _distance(old_position, position) > CAMERA_MOVE_M
    is_turned = _cos_between(old_forward, forward) < CAMERA_TURN_COS
    is_zoomed = abs(old_fov - fov) > CAMERA_FOV_RAD
    return is_moved or is_turned or is_zoomed
