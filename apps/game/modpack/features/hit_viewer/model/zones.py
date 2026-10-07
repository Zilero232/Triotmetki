from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hit_book import PART_CHASSIS, PART_GUN, PART_HULL, PART_TURRET, part_of
from .constants import (
    HULL_UPPER_FROM,
    ZONE_BANDS,
    ZONE_CHASSIS,
    ZONE_GUN,
    ZONE_HULL_LOWER,
    ZONE_HULL_REAR,
    ZONE_HULL_SIDE,
    ZONE_HULL_UPPER,
    ZONE_TURRET_FRONT,
    ZONE_TURRET_REAR,
    ZONE_TURRET_SIDE,
)
from .geometry import impact_point

FIXED_ZONES = {PART_CHASSIS: ZONE_CHASSIS, PART_GUN: ZONE_GUN}


def _middle(point):
    return tuple((start + end) / 2.0 for start, end in zip(point.start, point.end))


def _band(part, depth):
    rear, front = ZONE_BANDS[part]
    if depth >= front:
        return 'front'
    return 'rear' if depth <= rear else 'side'


def _hull_zone(height, depth):
    band = _band(PART_HULL, depth)
    if band == 'front':
        return ZONE_HULL_UPPER if height >= HULL_UPPER_FROM else ZONE_HULL_LOWER
    return ZONE_HULL_REAR if band == 'rear' else ZONE_HULL_SIDE


def _turret_zone(depth):
    band = _band(PART_TURRET, depth)
    if band == 'front':
        return ZONE_TURRET_FRONT
    return ZONE_TURRET_REAR if band == 'rear' else ZONE_TURRET_SIDE


def zone_of(segments):
    point = impact_point(segments)
    if point is None:
        return None
    part = part_of(point.part)
    if part in FIXED_ZONES:
        return FIXED_ZONES[part]
    _, height, depth = _middle(point)
    return _hull_zone(height, depth) if part == PART_HULL else _turret_zone(depth)
