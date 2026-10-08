from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.settings import Settings
from otmetki.features.hangar_tweaks.model import (
    REFUSE_BERTHS,
    REFUSE_LOCKED,
    REFUSE_NOTHING,
    carousel_row_count,
    is_still_planned,
    plan_crew_return,
    plan_crew_unload,
    plan_demount,
    plan_style_removal,
    rows_override,
    scale_index,
    to_native,
    with_interface_scale,
)
from otmetki.features.hangar_tweaks.settings import SCHEMA, SETTINGS

SCALE_OPTIONS = [0.0, 1.0, 1.25, 1.5, 2.0]


def vehicle_state(locked=False, **fields):
    state = {'locked': locked}
    state.update(fields)
    return state


def device(slot, removable, int_cd=None):
    return {'slot': slot, 'removable': removable, 'int_cd': int_cd}


class CarouselTest(unittest.TestCase):

    def test_native_keeps_the_game_value(self):
        assert to_native(Settings(None, SCHEMA).to_dict()) == {}

    def test_rows_and_tiles_become_the_game_indexes(self):
        values = Settings({'carousel_rows': '2', 'carousel_tiles': 'small'}, SCHEMA).to_dict()

        assert to_native(values) == {'carouselType': 1, 'doubleCarouselType': 1}

    def test_one_row_is_the_game_single_carousel(self):
        assert to_native(Settings({'carousel_rows': '1'}, SCHEMA).to_dict()) == {'carouselType': 0}

    def test_three_to_five_rows_ride_on_the_two_row_carousel(self):
        for rows in ('3', '4', '5'):
            assert to_native(Settings({'carousel_rows': rows}, SCHEMA).to_dict()) == {'carouselType': 1}

    def test_the_old_row_choices_are_migrated(self):
        assert Settings({'carousel_rows': 'single'}, SCHEMA).get('carousel_rows') == '1'
        assert Settings({'carousel_rows': 'double'}, SCHEMA).get('carousel_rows') == '2'

    def test_three_rows_are_allowed_and_six_are_not(self):
        assert Settings({'carousel_rows': '3'}, SCHEMA).get('carousel_rows') == '3'
        assert Settings({'carousel_rows': '6'}, SCHEMA).get('carousel_rows') == 'native'

    def test_only_three_to_five_rows_override_the_game(self):
        assert [rows_override(choice) for choice in ('native', '1', '2', '3', '4', '5')] == [
            None, None, None, 3, 4, 5]

    def test_the_mod_rows_replace_the_game_two_rows(self):
        assert carousel_row_count('4', 2) == 4

    def test_a_single_row_from_the_game_filter_stays(self):
        assert carousel_row_count('4', 1) == 1

    def test_the_game_rows_stay_without_an_override(self):
        assert carousel_row_count('native', 2) == 2
        assert carousel_row_count('5', None) is None

    def test_the_component_switch_is_hangar_tweaks(self):
        assert SETTINGS == ('hangar_tweaks',)


class InterfaceScaleTest(unittest.TestCase):

    def test_native_scale_is_left_alone(self):
        assert with_interface_scale({'carouselType': 1}, 'native', SCALE_OPTIONS) == {'carouselType': 1}

    def test_a_scale_the_screen_does_not_offer_is_left_alone(self):
        assert with_interface_scale({}, 'x1_75', SCALE_OPTIONS) == {}

    def test_no_screen_options_leave_the_scale_alone(self):
        assert with_interface_scale({}, 'x1_5', []) == {}

    def test_auto_is_the_first_option(self):
        assert scale_index(SCALE_OPTIONS, 'auto') == 0

    def test_a_scale_becomes_its_index_among_the_screen_options(self):
        assert scale_index(SCALE_OPTIONS, 'x2') == 4

    def test_the_scale_index_joins_the_other_values(self):
        result = with_interface_scale({'carouselType': 1}, 'x1_25', SCALE_OPTIONS)

        assert result == {'carouselType': 1, 'interfaceScale': 2}

    def test_an_unknown_scale_falls_back_to_native(self):
        assert Settings({'interface_scale': 'x3'}, SCHEMA).get('interface_scale') == 'native'


class StyleRemovalTest(unittest.TestCase):

    def test_an_installed_style_is_removed(self):
        assert plan_style_removal(vehicle_state(style=True)) is None

    def test_a_locked_vehicle_is_refused(self):
        assert plan_style_removal(vehicle_state(locked=True, style=True)) == REFUSE_LOCKED

    def test_no_style_is_nothing_to_do(self):
        assert plan_style_removal(vehicle_state(style=False)) == REFUSE_NOTHING


class DemountTest(unittest.TestCase):

    def test_the_planned_device_still_in_its_slot_is_demounted(self):
        assert is_still_planned(device(0, True, 101), device(0, True, 101)) is True

    def test_another_device_in_the_slot_is_left(self):
        assert is_still_planned(device(0, True, 101), device(0, True, 202)) is False

    def test_a_device_no_longer_removable_is_left(self):
        assert is_still_planned(device(0, True, 101), device(0, False, 101)) is False

    def test_an_emptied_slot_is_left(self):
        assert is_still_planned(device(0, True, 101), None) is False

    def test_only_removable_devices_are_demounted(self):
        devices = [device(0, True), None, device(2, False), device(3, True)]

        planned, _ = plan_demount(vehicle_state(devices=devices))

        assert [entry['slot'] for entry in planned] == [0, 3]

    def test_a_locked_vehicle_is_refused(self):
        state = vehicle_state(locked=True, devices=[device(0, True)])

        assert plan_demount(state) == ([], REFUSE_LOCKED)

    def test_no_removable_device_is_nothing_to_do(self):
        state = vehicle_state(devices=[device(0, False)])

        assert plan_demount(state) == ([], REFUSE_NOTHING)

    def test_no_devices_is_nothing_to_do(self):
        assert plan_demount(vehicle_state()) == ([], REFUSE_NOTHING)


class CrewUnloadTest(unittest.TestCase):

    def test_unknown_berths_let_the_crew_go(self):
        assert plan_crew_unload(vehicle_state(crew=4), None) == (4, None)

    def test_enough_berths_let_the_crew_go(self):
        assert plan_crew_unload(vehicle_state(crew=4), 10) == (4, None)

    def test_too_few_berths_are_refused(self):
        assert plan_crew_unload(vehicle_state(crew=4), 3) == (0, REFUSE_BERTHS)

    def test_a_locked_vehicle_is_refused(self):
        assert plan_crew_unload(vehicle_state(locked=True, crew=4), 10) == (0, REFUSE_LOCKED)

    def test_no_crew_is_nothing_to_do(self):
        assert plan_crew_unload(vehicle_state(crew=0), 10) == (0, REFUSE_NOTHING)


class CrewReturnTest(unittest.TestCase):

    def test_the_last_crew_is_returned(self):
        assert plan_crew_return(vehicle_state(last_crew=True)) is None

    def test_a_locked_vehicle_is_refused(self):
        assert plan_crew_return(vehicle_state(locked=True, last_crew=True)) == REFUSE_LOCKED

    def test_no_last_crew_is_nothing_to_do(self):
        assert plan_crew_return(vehicle_state(last_crew=False)) == REFUSE_NOTHING


if __name__ == '__main__':
    unittest.main()
