from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.hit_book import OUTCOME_BY_CODE, PART_NAMES
from ....core.shot_points import drawn_points
from ....core.vendor import attr
from .constants import SEGMENT_MARGIN

# Where a recorded hit sits on the hit vehicle, in the hit part's own coordinates. The packed point of a shot names the
# part and its segment as fractions of the part's bounding box (core.shot_points); the box is the part's collision box
# on the hangar model (RU 1.45 VehicleEffects.DamageFromShotDecoder.decodeSegment unpacks it the same way, widening
# the segment by 1% at both ends). poliroid BattleHits (HangarScene.__updateShell) draws the shell at the middle of
# that segment, turned along it: the segment runs along the shell's path through the plate.


@attr.s(frozen=True)
class HitGeometry(object):
    """`part` is the hit part's name (its node on the vehicle model), `point` the hit point and `direction` the unit
    vector of the shell's path, both in the part's coordinates."""

    part = attr.ib()
    point = attr.ib()
    direction = attr.ib()


def _sub(first, second):
    return tuple(a - b for a, b in zip(first, second))


def unit(vector):
    length = math.sqrt(sum(value * value for value in vector))
    if length <= 0:
        return None
    return tuple(value / length for value in vector)


def local_segment(point, box):
    low, high = box
    start = tuple(lo + (hi - lo) * fraction for lo, hi, fraction in zip(low, high, point.start))
    end = tuple(lo + (hi - lo) * fraction for lo, hi, fraction in zip(low, high, point.end))
    margin = tuple(value * SEGMENT_MARGIN for value in _sub(end, start))
    return _sub(start, margin), tuple(e + m for e, m in zip(end, margin))


def impact_point(segments):
    known = [point for point in drawn_points(segments) if point.code in OUTCOME_BY_CODE]
    return known[-1] if known else None


def hit_geometry(segments, boxes):
    """The HitGeometry of the point the hit's outcome belongs to (the last one the client drew), or None when the
    point's part has no box in `boxes` (part index -> (min, max) corners)."""
    point = impact_point(segments)
    if point is None or point.part >= len(PART_NAMES) or point.part not in boxes:
        return None
    start, end = local_segment(point, boxes[point.part])
    direction = unit(_sub(end, start))
    if direction is None:
        return None
    middle = tuple((a + b) / 2.0 for a, b in zip(start, end))
    return HitGeometry(PART_NAMES[point.part], middle, direction)
