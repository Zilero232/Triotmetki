from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int
from ....core.hit_book import OUTCOME_BY_CODE, part_of
from .constants import MAX_SEGMENTS
from .geometry import impact_point

# Fair play: these are the packed points of a shot the client itself receives to draw its hit effects on a vehicle
# (Vehicle.showDamageFromShot), only for the shots between the player's own tank and one other vehicle. A point says
# where on the hit vehicle the shell landed, never where the shooter stood.


def clean_segments(segments):
    if not isinstance(segments, (list, tuple)):
        return []
    return [int(segment) for segment in segments[:MAX_SEGMENTS] if is_int(segment) and segment >= 0]


def impact(segments):
    last = impact_point(segments)
    if last is None:
        return None
    return part_of(last.part), OUTCOME_BY_CODE[last.code]
