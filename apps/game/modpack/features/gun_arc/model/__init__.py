from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.compat import is_number
from .constants import CANVAS, MARK_NAMES, MIN_DISTANCE_M

# Fair play: the own gun's limits and marker point only; nothing is aimed, nothing about others read.


def _is_point(value, size):
    return isinstance(value, (tuple, list)) and len(value) == size and all(is_number(part) for part in value)


# UNVERIFIED on Lesta 1.45: a negative yaw is to the left (the lower limit first).
def sector_angles(limits):
    if not _is_point(limits, 2):
        return None
    low, high = limits
    if high <= low:
        return None
    return low, high, (low + high) / 2.0


def _ahead(pivot, yaw, distance, height):
    return pivot[0] + distance * math.sin(yaw), height, pivot[2] + distance * math.cos(yaw)


# BigWorld's yaw turns from +z towards +x.
def sector_points(pivot, hull_yaw, aim, limits):
    angles = sector_angles(limits)
    if angles is None or not _is_point(pivot, 3) or not _is_point(aim, 3) or not is_number(hull_yaw):
        return None
    distance = max(MIN_DISTANCE_M, math.hypot(aim[0] - pivot[0], aim[2] - pivot[2]))
    return {name: _ahead(pivot, hull_yaw + angle, distance, aim[1]) for name, angle in zip(MARK_NAMES, angles)}


# RU 1.45 AvatarInputHandler.cameras.projectPoint gives the clip-space point.
def screen_offset(clip, screen):
    if not _is_point(clip, 4) or clip[3] <= 0:
        return None
    x, y, _, w = clip
    width, height = screen
    return x / w * width / 2.0, -y / w * height / 2.0


def screen_size(size, scale):
    factor = max(scale, 1.0)
    return size[0] / factor, size[1] / factor


# RU 1.45 CrosshairDataProxy.getScaledPosition is in design px, getSize in screen px.
def reticle_offset(position, size, scale):
    width, height = screen_size(size, scale)
    return position[0] - width / 2.0, position[1] - height / 2.0


def _on_canvas(offset):
    return abs(offset[0]) <= CANVAS[0] / 2.0 and abs(offset[1]) <= CANVAS[1] / 2.0


def _from_reticle(point, reticle):
    if point is None:
        return None
    offset = (point[0] - reticle[0], point[1] - reticle[1])
    if not _on_canvas(offset):
        return None
    return int(round(offset[0])), int(round(offset[1]))


def marker_offsets(points, reticle):
    known = points or {}
    return {name: _from_reticle(known.get(name), reticle) for name in MARK_NAMES}
