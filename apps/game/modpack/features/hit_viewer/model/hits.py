from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int
from ....core.shot_points import drawn_points
from .constants import MAX_SEGMENTS, OUTCOME_BY_CODE, PART_NAMES

# Fair play: these are the packed points of a shot the client itself receives to draw its hit effects on a vehicle
# (Vehicle.showDamageFromShot), only for the shots between the player's own tank and one other vehicle. A point says
# where on the hit vehicle the shell landed, never where the shooter stood.


def clean_segments(segments):
    if not isinstance(segments, (list, tuple)):
        return []
    return [int(segment) for segment in segments[:MAX_SEGMENTS] if is_int(segment) and segment >= 0]


def part_of(index):
    return PART_NAMES[index] if 0 <= index < len(PART_NAMES) else PART_NAMES[0]


def impact(segments):
    known = [point for point in drawn_points(segments) if point.code in OUTCOME_BY_CODE]
    if not known:
        return None
    last = known[-1]
    return part_of(last.part), OUTCOME_BY_CODE[last.code]
