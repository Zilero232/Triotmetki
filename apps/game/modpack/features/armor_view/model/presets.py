from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.compat import clamp
from ....core.vendor import attr
from .constants import CAMERA_DISTANCE_FACTOR, CAMERA_DISTANCE_M, CAMERA_PRESETS

PRESET_IDS = tuple(preset_id for preset_id, _, _ in CAMERA_PRESETS)


@attr.s(frozen=True)
class CameraPose(object):
    yaw = attr.ib()
    pitch = attr.ib()
    distance = attr.ib()


def _wrapped(angle):
    return math.atan2(math.sin(angle), math.cos(angle))


def _preset(preset_id):
    for found_id, yaw, pitch in CAMERA_PRESETS:
        if found_id == preset_id:
            return yaw, pitch
    return None


def preset_pose(preset_id, vehicle_yaw, size):
    preset = _preset(preset_id)
    if preset is None:
        return None
    yaw_offset, pitch = preset

    low, high = CAMERA_DISTANCE_M
    distance = clamp(size * CAMERA_DISTANCE_FACTOR, low, high)
    yaw = _wrapped(vehicle_yaw + math.radians(yaw_offset))
    return CameraPose(yaw=yaw, pitch=math.radians(pitch), distance=distance)
