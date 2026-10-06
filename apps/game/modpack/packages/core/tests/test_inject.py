from __future__ import absolute_import, division, print_function, unicode_literals

import datetime
import unittest

import _support  # noqa: F401
from otmetki.core.inject import SpikeMode, message_of, spike_enabled, spike_text, valid_layout


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

        assert (mode.name, mode.edit, mode.mouse) == ('view', False, True)

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


if __name__ == '__main__':
    unittest.main()
