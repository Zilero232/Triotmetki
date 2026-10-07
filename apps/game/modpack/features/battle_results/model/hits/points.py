from __future__ import absolute_import, division, print_function, unicode_literals

from .....core.hit_book import OUTCOME_BY_CODE, part_of
from .....core.shot_points import drawn_points
from .constants import FRONT_Z, MIDDLE, REAR_Z, SIDED_PARTS

# Fair play: hits on the own tank as the client draws them; nothing says where the shooter was.


def _middle(start, end):
    return tuple(round((first + second) / 2.0, 3) for first, second in zip(start, end))


def impact(segments):
    known = [point for point in drawn_points(segments) if point.code in OUTCOME_BY_CODE]
    if not known:
        return None
    last = known[-1]
    return part_of(last.part), OUTCOME_BY_CODE[last.code], _middle(last.start, last.end)


def side_of(part, x, z):
    # UNVERIFIED on Lesta 1.45: +z is the front of the part and +x its right side (the BigWorld model axes).
    if part not in SIDED_PARTS:
        return None
    if z >= FRONT_Z:
        return 'front'
    if z <= REAR_Z:
        return 'rear'
    return 'left' if x < MIDDLE else 'right'
