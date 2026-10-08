# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.sub_view import SubViewPage, clamped_move, is_move, parse_message

COMMANDS = {'ready': (), 'pick': ('id',)}


class ParseMessageTest(unittest.TestCase):

    def test_a_command_without_fields_is_understood(self):
        assert parse_message('{"command": "ready"}', COMMANDS, 100) == ('ready', {})

    def test_a_command_keeps_only_its_own_fields(self):
        found = parse_message('{"command": "pick", "id": "a", "extra": 1}', COMMANDS, 100)

        assert found == ('pick', {'id': 'a'})

    def test_a_missing_field_is_refused(self):
        assert parse_message('{"command": "pick"}', COMMANDS, 100) is None

    def test_an_unknown_command_is_refused(self):
        assert parse_message('{"command": "drop"}', COMMANDS, 100) is None

    def test_a_message_past_the_limit_is_refused(self):
        assert parse_message('{"command": "ready"}', COMMANDS, 5) is None

    def test_junk_is_refused(self):
        assert parse_message('{', COMMANDS, 100) is None

    def test_a_list_is_refused(self):
        assert parse_message('[1]', COMMANDS, 100) is None


class MoveTest(unittest.TestCase):

    def test_three_numbers_are_a_move(self):
        assert is_move({'dx': 1, 'dy': 0, 'dz': -2.5}) is True

    def test_a_text_step_is_no_move(self):
        assert is_move({'dx': 'far', 'dy': 0, 'dz': 0}) is False

    def test_a_huge_step_is_clamped(self):
        assert clamped_move({'dx': 99999, 'dy': 0, 'dz': 0})['dx'] == 2000.0


class SubViewPageTest(unittest.TestCase):

    def test_the_properties_are_kept_in_order(self):
        page = SubViewPage(key='otmetki/ui/x', properties=['state', 'map'])

        assert page.properties == ('state', 'map')


if __name__ == '__main__':
    unittest.main()
