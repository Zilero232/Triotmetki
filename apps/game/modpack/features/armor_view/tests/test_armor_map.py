# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import math
import unittest

import _support
from otmetki.core.armor import Plate, Shell
from otmetki.features.armor_view.i18n import STRINGS
from otmetki.features.armor_view.model import (
    Attack,
    GridBuild,
    cell_code,
    encode_cells,
    has_moved,
    levels_for,
    readout,
    screen_box,
    screen_fraction,
)
from otmetki.features.armor_view.model.cells import chance_tone, thickness_tone
from otmetki.features.armor_view.model.constants import CELL_ALPHABET, THICKNESS_STOPS
from otmetki.features.armor_view.model.grid import Box, Level, cells_near, level_of

TRANSLATE = _support.translator(STRINGS)
SCREEN = (1920, 1080)
BOX = Box(left=0.25, top=0.25, right=0.75, bottom=0.75)
POSE = ((0.0, 1.0, -8.0), (0.0, 0.0, 1.0), 1.0)


def plate(armor, angle=0.0, spaced=False, part='hull', distance=1.0):
    return Plate(
        distance=distance, hit_cos=math.cos(math.radians(angle)), part=part, material_kind=1, armor=armor,
        is_spaced=spaced,
    )


def attack(power=200.0, caliber=100.0, kind='ARMOR_PIERCING'):
    shell = Shell(kind=kind, caliber=caliber, power_near=power, power_far=power, max_distance=720.0)
    return Attack(shell=shell, power=power)


def finish_all(build, code_of):
    while not build.is_done:
        for index in build.next_cells(10000):
            build.record(index, code_of(build.level, index), [index])
        build.finish_level()


class ScreenBoxTest(unittest.TestCase):

    def test_maps_clip_space_to_screen_fractions(self):
        assert screen_fraction(-1.0, 1.0) == (0.0, 0.0)

    def test_the_bottom_right_corner_is_one_one(self):
        assert screen_fraction(1.0, -1.0) == (1.0, 1.0)

    def test_widens_the_box_by_its_margin(self):
        box = screen_box([(-0.5, 0.5), (0.5, -0.5)], margin=0.1)

        assert round(box.left, 3) == 0.2

    def test_holds_the_box_on_the_screen(self):
        box = screen_box([(-2.0, 0.5), (0.5, -0.5)], margin=0.0)

        assert box.left == 0.0

    def test_no_points_is_no_box(self):
        assert screen_box([]) is None

    def test_a_box_off_the_screen_is_no_box(self):
        assert screen_box([(1.5, 0.5), (2.0, -0.5)]) is None


class LevelTest(unittest.TestCase):

    def test_cells_follow_the_design_size_on_the_screen(self):
        level = level_of(BOX, SCREEN, 32)

        assert (level.cols, level.rows) == (30, 17)

    def test_a_cell_centre_is_inside_the_box(self):
        level = level_of(BOX, SCREEN, 32)

        assert BOX.contains(*level.centre(level.size - 1))

    def test_finds_the_cell_under_a_point(self):
        level = Level(box=BOX, cols=2, rows=2, cell_px=8)

        assert level.cell_at(0.7, 0.7) == 3

    def test_a_point_outside_the_box_is_no_cell(self):
        level = Level(box=BOX, cols=2, rows=2, cell_px=8)

        assert level.cell_at(0.1, 0.5) is None

    def test_the_clip_point_of_the_centre_cell_is_the_screen_centre(self):
        level = Level(box=Box(0.0, 0.0, 1.0, 1.0), cols=1, rows=1, cell_px=8)

        assert level.clip(0) == (0.0, 0.0)

    def test_medium_detail_has_three_levels(self):
        assert len(levels_for(BOX, SCREEN, 'medium')) == 3

    def test_an_unknown_detail_is_medium(self):
        assert len(levels_for(BOX, SCREEN, 'ultra')) == 3


class CellsNearTest(unittest.TestCase):

    def test_casts_only_near_the_armour_the_coarse_level_found(self):
        coarse = Level(box=BOX, cols=4, rows=1, cell_px=16)
        fine = Level(box=BOX, cols=8, rows=1, cell_px=8)

        near = cells_near(fine, coarse, [1, 0, 0, 0])

        assert near == [0, 1, 2, 3]

    def test_a_coarse_level_without_armour_leaves_nothing(self):
        coarse = Level(box=BOX, cols=2, rows=1, cell_px=16)
        fine = Level(box=BOX, cols=4, rows=1, cell_px=8)

        assert cells_near(fine, coarse, [0, 0]) == []


class GridBuildTest(unittest.TestCase):

    def test_the_first_level_casts_every_cell(self):
        build = GridBuild([Level(box=BOX, cols=3, rows=2, cell_px=16)])

        assert len(build.next_cells(100)) == 6

    def test_hands_out_at_most_the_limit(self):
        build = GridBuild([Level(box=BOX, cols=3, rows=2, cell_px=16)])

        assert len(build.next_cells(4)) == 4

    def test_finishes_after_its_last_level(self):
        build = GridBuild(levels_for(BOX, SCREEN, 'low'))

        finish_all(build, lambda level, index: 1)

        assert build.is_done is True

    def test_returns_the_finished_level_and_its_codes(self):
        build = GridBuild([Level(box=BOX, cols=2, rows=1, cell_px=16)])
        for index in build.next_cells(10):
            build.record(index, 5)

        assert build.finish_level()[1] == [5, 5]

    def test_recode_draws_the_finished_level_again(self):
        build = GridBuild([Level(box=BOX, cols=2, rows=1, cell_px=16)])
        finish_all(build, lambda level, index: 1)

        build.recode(lambda plates: 9)

        assert build.finished()[1] == [9, 9]

    def test_progress_counts_the_levels(self):
        build = GridBuild([Level(box=BOX, cols=2, rows=1, cell_px=16), Level(box=BOX, cols=4, rows=1, cell_px=8)])
        for index in build.next_cells(10):
            build.record(index, 1)
        build.finish_level()

        assert build.progress == 0.5


class CellCodeTest(unittest.TestCase):

    def test_no_plate_is_empty(self):
        assert cell_code([], 'nominal') == 0

    def test_a_thin_plate_has_the_first_tone(self):
        assert thickness_tone(THICKNESS_STOPS[0]) == 1

    def test_armour_past_the_last_stop_has_the_last_tone(self):
        assert thickness_tone(THICKNESS_STOPS[-1] + 1) == len(THICKNESS_STOPS) + 1

    def test_the_effective_mode_counts_the_angle(self):
        plates = [plate(50, angle=60)]

        assert cell_code(plates, 'effective') > cell_code(plates, 'nominal')

    def test_a_screen_in_front_hatches_the_main_plate(self):
        code = cell_code([plate(10, spaced=True), plate(50)], 'nominal')

        assert code == thickness_tone(50) + 16

    def test_a_track_in_front_has_its_own_hatch(self):
        code = cell_code([plate(20, spaced=True, part='track'), plate(50)], 'nominal')

        assert code == thickness_tone(50) + 32

    def test_a_screen_without_armour_behind_has_its_fixed_tone(self):
        assert cell_code([plate(10, spaced=True)], 'nominal') == 13

    def test_the_gun_alone_has_its_fixed_tone(self):
        assert cell_code([plate(30, spaced=True, part='gun')], 'nominal') == 15

    def test_a_penetrated_plate_is_green(self):
        assert cell_code([plate(100)], 'shell', attack()) == 1

    def test_a_plate_past_the_band_is_red(self):
        assert cell_code([plate(400)], 'shell', attack()) == 7

    def test_a_ricochet_has_its_tone(self):
        assert cell_code([plate(100, angle=80)], 'shell', attack(caliber=50.0)) == 8

    def test_an_even_match_is_a_middle_chance(self):
        assert cell_code([plate(200)], 'shell', attack()) == 4

    def test_a_likely_chance_has_the_first_chance_tone(self):
        assert chance_tone(0.9) == 2

    def test_an_unlikely_chance_has_the_last_chance_tone(self):
        assert chance_tone(0.05) == 6

    def test_encodes_one_character_per_cell(self):
        assert encode_cells([0, 1, 47]) == '01' + CELL_ALPHABET[47]


class CameraTest(unittest.TestCase):

    def test_the_same_pose_did_not_move(self):
        assert has_moved(POSE, POSE) is False

    def test_a_step_moved(self):
        assert has_moved(POSE, ((0.1, 1.0, -8.0), (0.0, 0.0, 1.0), 1.0)) is True

    def test_a_turn_moved(self):
        assert has_moved(POSE, ((0.0, 1.0, -8.0), (0.1, 0.0, 1.0), 1.0)) is True

    def test_a_zoom_moved(self):
        assert has_moved(POSE, ((0.0, 1.0, -8.0), (0.0, 0.0, 1.0), 1.1)) is True

    def test_no_earlier_pose_counts_as_moved(self):
        assert has_moved(None, POSE) is True


class ReadoutTest(unittest.TestCase):

    def test_no_plates_is_no_card(self):
        assert readout([], 'nominal', None, TRANSLATE) is None

    def test_names_the_part_of_the_main_plate(self):
        card = readout([plate(10, spaced=True, part='track'), plate(80, part='hull')], 'nominal', None, TRANSLATE)

        assert card['title'] == u'Корпус'

    def test_lists_the_plates_up_to_the_main_one(self):
        plates = [plate(10, spaced=True), plate(80), plate(40)]

        card = readout(plates, 'nominal', None, TRANSLATE)

        assert len(card['rows']) == 2

    def test_a_plate_row_shows_nominal_angle_and_effective(self):
        card = readout([plate(100, angle=60)], 'effective', None, TRANSLATE)

        assert card['rows'][0]['value'] == u'100 мм · 60° › 200 мм'

    def test_the_shell_mode_names_the_verdict(self):
        card = readout([plate(100)], 'shell', attack(), TRANSLATE)

        assert card['verdict'] == u'Пробьёт всегда'

    def test_the_shell_mode_gives_the_chance(self):
        card = readout([plate(200)], 'shell', attack(), TRANSLATE)

        assert card['verdict'] == u'Пробьёт с шансом ~50 %'

    def test_the_shell_mode_shows_the_penetration_needed(self):
        card = readout([plate(20, spaced=True), plate(100)], 'shell', attack(), TRANSLATE)

        assert card['rows'][2]['value'] == u'120 мм'

    def test_the_overmatch_is_noted(self):
        card = readout([plate(30, angle=80)], 'shell', attack(caliber=100.0), TRANSLATE)

        assert u'Калибр больше трёх толщин: рикошета нет' in [row['label'] for row in card['rows']]


if __name__ == '__main__':
    unittest.main()
