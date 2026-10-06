# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.shot_points import decode_segment, drawn_points


def segment(part, code, start, end):
    value = code | (part << 8)
    for shift, byte in zip((16, 24, 32, 40, 48, 56), tuple(start) + tuple(end)):
        value |= byte << shift
    return value


FRONT_HULL_PEN = segment(1, 4, (120, 100, 250), (130, 110, 255))
TURRET_RICOCHET = segment(2, 2, (0, 128, 120), (10, 128, 130))
POINT_WITHOUT_LENGTH = segment(1, 4, (5, 5, 5), (5, 5, 5))


class DecodeSegmentTest(unittest.TestCase):

    def test_decodes_the_part_index(self):
        assert decode_segment(FRONT_HULL_PEN).part == 1

    def test_the_hit_effect_code_is_the_low_byte(self):
        assert decode_segment(FRONT_HULL_PEN).code == 4

    def test_decodes_the_start_as_fractions_of_the_part_box(self):
        start = decode_segment(FRONT_HULL_PEN).start

        assert [round(value, 3) for value in start] == [0.471, 0.392, 0.98]

    def test_decodes_the_end_as_fractions_of_the_part_box(self):
        end = decode_segment(FRONT_HULL_PEN).end

        assert [round(value, 3) for value in end] == [0.51, 0.431, 1.0]

    def test_a_negative_segment_is_not_a_point(self):
        assert decode_segment(-1) is None

    def test_a_non_number_is_not_a_point(self):
        assert decode_segment('x') is None


class DrawnPointsTest(unittest.TestCase):

    def test_keeps_the_points_in_order(self):
        points = drawn_points([TURRET_RICOCHET, FRONT_HULL_PEN])

        assert [point.code for point in points] == [2, 4]

    def test_a_point_without_length_is_not_drawn(self):
        points = drawn_points([FRONT_HULL_PEN, POINT_WITHOUT_LENGTH])

        assert [point.code for point in points] == [4]

    def test_undecodable_segments_are_skipped(self):
        points = drawn_points([-1, 'x', TURRET_RICOCHET])

        assert [point.part for point in points] == [2]

    def test_no_segments_draw_nothing(self):
        assert drawn_points(None) == []


if __name__ == '__main__':
    unittest.main()
