# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import json
import math
import unittest

import _support
from otmetki.core.armor import Plate, Shell
from otmetki.features.armor_view.i18n import STRINGS
from otmetki.features.armor_view.model import (
    Attack,
    Attacker,
    Module,
    ModuleChoice,
    PageView,
    RayTiming,
    TankRow,
    Turret,
    decode_message,
    default_choice,
    garage_order,
    is_listed,
    map_state,
    page_state,
    picked,
    preset_pose,
    readout,
    search,
    shell_label,
    status_state,
    with_turret,
)
from otmetki.features.armor_view.model.constants import HOVER_LOG_EVERY, THICKNESS_STOPS
from otmetki.features.armor_view.model.grid import Box, Level
from otmetki.features.armor_view.model.tanks import clean_query

TRANSLATE = _support.translator(STRINGS)
FIXTURES = 'views/armor-viewer/lib/armor-protocol/_tests/fixtures/'
BOX = Box(left=0.25, top=0.25, right=0.75, bottom=0.75)
T34 = TankRow(cd=2849, name=u'Т-34', tier=5, kind='mediumTank', is_own=True)
IS3 = TankRow(cd=7169, name=u'ИС-3', tier=8, kind='heavyTank', is_own=True)
MAUS = TankRow(cd=12305, name=u'Maus', tier=10, kind='heavyTank')
STOCK_GUN = Module(cd=101, name=u'Ф-34')
TOP_GUN = Module(cd=102, name=u'ЗИС-С-53')
TURRETS = (
    Turret(cd=11, name=u'Т-34 обр. 1940', guns=(STOCK_GUN,)),
    Turret(cd=12, name=u'Т-34 обр. 1942', guns=(STOCK_GUN, TOP_GUN)),
)


def plate(armor, angle=0.0, spaced=False, part='hull'):
    return Plate(
        distance=1.0, hit_cos=math.cos(math.radians(angle)), part=part, material_kind=1, armor=armor,
        is_spaced=spaced,
    )


def attack(power=200.0, caliber=100.0, kind='ARMOR_PIERCING'):
    shell = Shell(kind=kind, caliber=caliber, power_near=power, power_far=power, max_distance=720.0)
    return Attack(shell=shell, power=power)


def message(**fields):
    return json.dumps(fields)


def sample_view():
    return PageView(
        tank=T34,
        mode='shell',
        garage=(IS3, T34),
        query=u'ma',
        matches=(MAUS,),
        turrets=TURRETS,
        choice=ModuleChoice(turret=12, gun=102),
        attacker=Attacker(cd=7169, name=u'ИС-3', tier=8),
        shell_labels=(u'ББ 175 мм', u'БП 217 мм'),
        shell_index=1,
        distance=250,
    )


class TanksTest(unittest.TestCase):

    def test_the_garage_lists_the_highest_tier_first(self):
        assert [row.cd for row in garage_order([T34, IS3])] == [7169, 2849]

    def test_a_search_matches_part_of_the_name_in_any_case(self):
        assert [row.cd for row in search([T34, MAUS], 'ma', set())] == [12305]

    def test_an_own_match_comes_first(self):
        found = search([MAUS, TankRow(cd=1, name=u'Maus jr', tier=1)], 'maus', {1})

        assert [row.cd for row in found] == [1, 12305]

    def test_a_match_is_marked_as_own(self):
        assert search([MAUS], 'maus', {12305})[0].is_own is True

    def test_an_empty_query_finds_nothing(self):
        assert search([MAUS], '', set()) == []

    def test_the_query_is_trimmed_and_lowered(self):
        assert clean_query(u'  МАУС ') == u'маус'

    def test_a_hidden_tank_is_not_listed(self):
        assert is_listed({'is_hidden': True}) is False

    def test_a_bot_is_not_listed(self):
        assert is_listed({'is_bot': True}) is False

    def test_a_plain_tank_is_listed(self):
        assert is_listed({'is_hidden': False, 'is_event': False}) is True


class ModulesTest(unittest.TestCase):

    def test_a_foreign_tank_starts_on_its_top_turret_and_gun(self):
        assert default_choice(TURRETS) == ModuleChoice(turret=12, gun=102)

    def test_an_own_tank_keeps_its_installed_modules(self):
        installed = ModuleChoice(turret=11, gun=101)

        assert default_choice(TURRETS, installed) == installed

    def test_installed_modules_the_type_lacks_fall_back_to_the_top(self):
        assert default_choice(TURRETS, ModuleChoice(turret=99, gun=1)) == ModuleChoice(turret=12, gun=102)

    def test_no_turrets_is_no_choice(self):
        assert default_choice(()) is None

    def test_another_turret_keeps_a_gun_it_carries(self):
        choice = with_turret(TURRETS, ModuleChoice(turret=12, gun=101), 11)

        assert choice == ModuleChoice(turret=11, gun=101)

    def test_another_turret_takes_its_top_gun_when_it_lacks_the_gun(self):
        choice = with_turret(TURRETS, ModuleChoice(turret=12, gun=102), 11)

        assert choice == ModuleChoice(turret=11, gun=101)

    def test_a_gun_the_turret_lacks_is_not_picked(self):
        choice = picked(TURRETS, ModuleChoice(turret=11, gun=101), 11, 102)

        assert choice == ModuleChoice(turret=11, gun=101)

    def test_a_gun_of_the_turret_is_picked(self):
        choice = picked(TURRETS, ModuleChoice(turret=12, gun=102), 12, 101)

        assert choice == ModuleChoice(turret=12, gun=101)


class PresetTest(unittest.TestCase):

    def test_the_front_view_looks_back_at_the_nose(self):
        pose = preset_pose('front', 0.0, 6.0)

        assert round(abs(pose.yaw), 4) == round(math.pi, 4)

    def test_the_rear_view_follows_the_tank(self):
        assert round(preset_pose('rear', 0.5, 6.0).yaw, 4) == 0.5

    def test_the_distance_follows_the_tank_size(self):
        assert preset_pose('side', 0.0, 6.0).distance == 9.0

    def test_a_small_tank_keeps_the_nearest_distance(self):
        assert preset_pose('side', 0.0, 1.0).distance == 5.0

    def test_a_huge_tank_keeps_the_farthest_distance(self):
        assert preset_pose('side', 0.0, 40.0).distance == 14.0

    def test_the_top_view_looks_steeply_down(self):
        assert round(math.degrees(preset_pose('top', 0.0, 6.0).pitch)) == 75

    def test_an_unknown_preset_is_no_pose(self):
        assert preset_pose('under', 0.0, 6.0) is None


class ProtocolTest(unittest.TestCase):

    def test_a_hover_is_held_on_the_screen(self):
        assert decode_message(message(command='hover', x=1.5, y=0.25)) == ('hover', {'x': 1.0, 'y': 0.25})

    def test_a_hover_without_numbers_is_refused(self):
        assert decode_message(message(command='hover', x='left', y=0.25)) is None

    def test_a_distance_is_stepped_and_held(self):
        assert decode_message(message(command='distance', m=734.0)) == ('distance', {'m': 600})

    def test_a_distance_rounds_to_its_step(self):
        assert decode_message(message(command='distance', m=124.0)) == ('distance', {'m': 120})

    def test_an_unknown_mode_is_refused(self):
        assert decode_message(message(command='mode', mode='xray')) is None

    def test_a_tank_needs_a_positive_id(self):
        assert decode_message(message(command='tank', cd=0)) is None

    def test_modules_need_both_ids(self):
        assert decode_message(message(command='modules', turret=11, gun=None)) is None

    def test_a_search_is_trimmed(self):
        assert decode_message(message(command='search', text=u' Maus ')) == ('search', {'text': u'maus'})

    def test_an_unknown_camera_preset_is_refused(self):
        assert decode_message(message(command='camera', preset='under')) is None

    def test_a_camera_drag_is_clamped(self):
        assert decode_message(message(command='move', dx=99999, dy=0, dz=0))[1]['dx'] == 2000.0

    def test_a_negative_shell_is_refused(self):
        assert decode_message(message(command='shell', index=-1)) is None

    def test_an_empty_diag_is_refused(self):
        assert decode_message(message(command='diag', text='')) is None

    def test_junk_is_refused(self):
        assert decode_message('{') is None


class PageTest(unittest.TestCase):

    def test_the_active_mode_is_marked(self):
        state = page_state(sample_view(), TRANSLATE)

        assert [mode['active'] for mode in state['modes']] == [False, False, True]

    def test_the_tabs_are_nominal_effective_penetration(self):
        state = page_state(sample_view(), TRANSLATE)

        assert [mode['label'] for mode in state['modes']] == [u'Номинал', u'Приведённая', u'Пробитие']

    def test_the_shown_tank_is_marked_in_the_garage(self):
        state = page_state(sample_view(), TRANSLATE)

        assert [row['active'] for row in state['garage']] == [False, True]

    def test_the_attacker_is_marked_in_its_choices(self):
        state = page_state(sample_view(), TRANSLATE)

        assert [row['active'] for row in state['attackers']] == [True, False]

    def test_the_guns_are_the_chosen_turrets(self):
        state = page_state(sample_view(), TRANSLATE)

        assert [gun['cd'] for gun in state['modules']['guns']] == [101, 102]

    def test_the_shell_mode_shows_the_verdict_scale(self):
        state = page_state(sample_view(), TRANSLATE)

        assert state['legend']['unit'] is None

    def test_the_thickness_scale_has_a_tone_per_stop_and_one_past_them(self):
        state = page_state(PageView(tank=T34, mode='nominal'), TRANSLATE)

        assert len(state['legend']['scale']) == len(THICKNESS_STOPS) + 1

    def test_every_camera_preset_has_its_label(self):
        state = page_state(sample_view(), TRANSLATE)

        assert [camera['label'] for camera in state['cameras']] == [u'Лоб', u'Лоб 30°', u'Борт', u'Корма', u'Сверху']

    def test_no_tank_is_an_empty_picker(self):
        state = page_state(PageView(tank=None, mode='nominal'), TRANSLATE)

        assert state['tank'] is None

    def test_the_shell_label_names_the_kind_and_penetration(self):
        assert shell_label(attack().shell, 201.4, TRANSLATE) == u'ББ 201 мм'

    def test_the_status_shows_the_build_progress_in_steps(self):
        assert status_state('building', 0.47, TRANSLATE)['text'] == u'Строю карту: 45 %'

    def test_a_ready_map_has_no_progress(self):
        assert status_state('ready', 1.0, TRANSLATE)['progress'] is None

    def test_the_map_names_its_box(self):
        state = map_state(Level(box=BOX, cols=2, rows=1, cell_px=8), [1, 0], 'nominal', 60)

        assert state['left'] == 0.25

    def test_the_map_carries_one_character_per_cell(self):
        state = map_state(Level(box=BOX, cols=2, rows=1, cell_px=8), [1, 0], 'nominal', 60)

        assert state['cells'] == '10'


class TimingTest(unittest.TestCase):

    def test_the_first_ray_is_logged(self):
        assert RayTiming().add(0.1, 2) is True

    def test_the_second_ray_is_not_logged(self):
        timing = RayTiming()
        timing.add(0.1, 2)

        assert timing.add(0.1, 2) is False

    def test_every_interval_is_logged(self):
        timing = RayTiming()
        for _ in range(HOVER_LOG_EVERY - 1):
            timing.add(0.1, 1)

        assert timing.add(0.1, 1) is True

    def test_the_summary_counts_the_rays(self):
        timing = RayTiming()
        timing.add(0.2, 1)
        timing.add(0.4, 3)

        assert timing.summary() == (
            'armor view: hover rays: 2 in 0.6 ms (0.30 ms each, worst 0.40 ms, 4 plates met)'
        )


class PageFixtureTest(unittest.TestCase):

    def test_the_state_matches_the_page_fixture(self):
        assert _support.ui_fixture(FIXTURES + 'armor-state.sample.json', page_state(sample_view(), TRANSLATE))

    def test_the_map_matches_the_page_fixture(self):
        level = Level(box=BOX, cols=4, rows=2, cell_px=8)

        state = map_state(level, [0, 1, 2, 12, 17, 33, 13, 15], 'nominal', 60)

        assert _support.ui_fixture(FIXTURES + 'armor-map.sample.json', state)

    def test_the_hover_card_matches_the_page_fixture(self):
        card = readout([plate(20, spaced=True), plate(150, angle=40)], 'shell', attack(power=230.0), TRANSLATE)

        assert _support.ui_fixture(FIXTURES + 'armor-hover.sample.json', card)

    def test_the_status_matches_the_page_fixture(self):
        assert _support.ui_fixture(FIXTURES + 'armor-status.sample.json', status_state('building', 0.5, TRANSLATE))


if __name__ == '__main__':
    unittest.main()
