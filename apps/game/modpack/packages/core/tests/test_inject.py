from __future__ import absolute_import, division, print_function, unicode_literals

import datetime
import unittest

import _support  # noqa: F401
from otmetki.core.inject import (
    SpikeMode,
    below_covers,
    inject_wanted,
    message_of,
    spike_enabled,
    spike_text,
    valid_layout,
)
from otmetki.core.inject.constants import BATTLE_SPIKE_TEXT


class SpikeEnabledTest(unittest.TestCase):

    def test_off_outside_a_dev_install_even_when_asked(self):
        assert spike_enabled({'OTMETKI_INJECT_SPIKE': '1'}, True, False) is False

    def test_off_in_a_dev_install_that_did_not_ask(self):
        assert spike_enabled({}, False, True) is False

    def test_the_environment_turns_it_on_in_a_dev_install(self):
        assert spike_enabled({'OTMETKI_INJECT_SPIKE': '1'}, False, True) is True

    def test_the_flag_file_turns_it_on_in_a_dev_install(self):
        assert spike_enabled({}, True, True) is True

    def test_another_environment_value_does_not_turn_it_on(self):
        assert spike_enabled({'OTMETKI_INJECT_SPIKE': '0'}, False, True) is False


class ValidLayoutTest(unittest.TestCase):

    def test_keeps_a_layout_id(self):
        assert valid_layout(4100) == 4100

    def test_the_invalid_res_id_is_none(self):
        assert valid_layout(-1) is None

    def test_a_non_int_answer_is_none(self):
        assert valid_layout('4100') is None

    def test_a_bool_is_none(self):
        assert valid_layout(True) is None


class MessageOfTest(unittest.TestCase):

    def test_reads_a_dict(self):
        assert message_of({'message': '{"type":"ready"}'}) == '{"type":"ready"}'

    def test_reads_a_dict_like_proxy(self):
        class Proxy(object):
            def get(self, key):
                return 'from ' + key

        assert message_of(Proxy()) == 'from message'

    def test_anything_else_is_none(self):
        assert message_of(None) is None


class SpikeModeTest(unittest.TestCase):

    def test_starts_in_view_mode_with_the_mouse_passing_through_the_page(self):
        mode = SpikeMode()

        assert (mode.name, mode.edit, mode.mouse) == ('view', False, False)

    def test_next_is_edit(self):
        mode = SpikeMode().next()

        assert (mode.name, mode.edit, mode.mouse) == ('edit', True, True)

    def test_locked_keeps_the_mouse_from_the_page(self):
        mode = SpikeMode().next().next()

        assert (mode.name, mode.edit, mode.mouse) == ('locked', True, False)

    def test_wraps_around_to_view(self):
        mode = SpikeMode().next().next().next()

        assert mode.name == 'view'


class SpikeTextTest(unittest.TestCase):

    def test_shows_the_mode_and_the_time(self):
        text = spike_text('edit', datetime.datetime(2026, 10, 6, 9, 5, 7))

        assert text == 'Tri otmetki inject spike | edit | 09:05:07'

    def test_the_battle_spike_names_itself(self):
        text = spike_text('view', datetime.datetime(2026, 10, 6, 9, 5, 7), BATTLE_SPIKE_TEXT)

        assert text == 'Tri otmetki battle inject spike | view | 09:05:07'


class InjectWantedTest(unittest.TestCase):

    def test_on_by_default(self):
        assert inject_wanted(True, False) is True

    def test_a_missing_setting_counts_as_on(self):
        assert inject_wanted(None, False) is True

    def test_the_player_switches_it_off(self):
        assert inject_wanted(False, False) is False

    def test_a_page_that_failed_this_session_stays_off(self):
        assert inject_wanted(True, True) is False


class BelowCoversTest(unittest.TestCase):

    def test_goes_below_the_lowest_cover(self):
        assert below_covers([7, 3, 9]) == 3

    def test_skips_a_cover_the_page_lacks(self):
        assert below_covers([None, 5]) == 5

    def test_takes_an_index_the_bridge_handed_over_as_a_float(self):
        assert below_covers([4.0, 6]) == 4

    def test_a_bool_is_no_index(self):
        assert below_covers([True]) is None

    def test_none_without_any_cover(self):
        assert below_covers([None, None]) is None


if __name__ == '__main__':
    unittest.main()
