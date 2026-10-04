# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.quick_demount.i18n import STRINGS
from otmetki.features.quick_demount.model import carriers, demount_menu, option_id, tier_numeral, vehicle_of
from otmetki.features.quick_demount.settings import GROUP, SCHEMA, SETTINGS, SWITCH

GARAGE = [
    {'id': 1, 'name': u'Т-34', 'tier': 5, 'slot': 0, 'locked': False},
    {'id': 2, 'name': u'Т-44', 'tier': 8, 'slot': 1, 'locked': False},
    {'id': 3, 'name': u'Об. 140', 'tier': 10, 'slot': 2, 'locked': False},
    {'id': 4, 'name': u'Т-54', 'tier': 9, 'slot': 0, 'locked': True},
    {'id': 5, 'name': u'КВ-1', 'tier': 5, 'slot': 0, 'locked': False},
]


def menu(current_id=1, language='en', **values):
    return demount_menu(GARAGE, current_id, Settings(values, SCHEMA), _support.translator(STRINGS, language))


class CarriersTest(unittest.TestCase):

    def test_the_highest_tier_comes_first_then_the_name(self):
        assert [row['id'] for row in carriers(GARAGE, None, True)] == [3, 4, 2, 5, 1]

    def test_the_tank_being_set_up_is_left_out(self):
        assert 1 not in [row['id'] for row in carriers(GARAGE, 1, True)]

    def test_locked_tanks_can_be_hidden(self):
        assert 4 not in [row['id'] for row in carriers(GARAGE, 1, False)]


class MenuTest(unittest.TestCase):

    def test_each_tank_is_one_option_with_its_tier(self):
        items = menu()['items']

        assert items[0] == {'id': 'otmetki_quick_demount:3', 'label': u'X  Об. 140', 'enabled': True}
        assert [item['label'][:4] for item in items] == [u'X  О', u'IX  ', u'VIII', u'V  К']

    def test_a_locked_tank_is_listed_but_cannot_be_picked(self):
        assert menu()['items'][1]['enabled'] is False

    def test_the_entry_is_named_in_the_players_language(self):
        assert menu(language='ru')['label'] == u'Быстрый демонтаж'

    def test_a_list_within_the_limit_has_no_rest_line(self):
        items = menu(current_id=None)['items']

        assert [item['id'] for item in items][-1] == 'otmetki_quick_demount:1'

    def test_the_rest_line_counts_the_hidden_tanks(self):
        garage = [dict(GARAGE[0], id=index, tier=5) for index in range(10, 33)]
        items = demount_menu(garage, None, Settings({}, SCHEMA), _support.translator(STRINGS, 'en'))['items']

        assert items[-1] == {'id': 'otmetki_quick_demount_more', 'label': u'…and 3 more', 'enabled': False}

    def test_no_other_carrier_means_no_entry(self):
        assert demount_menu(GARAGE[:1], 1, Settings({}, SCHEMA), _support.translator(STRINGS, 'en')) is None


class OptionIdTest(unittest.TestCase):

    def test_the_option_names_the_vehicle(self):
        assert vehicle_of(option_id(51809)) == 51809

    def test_the_clients_own_options_are_not_ours(self):
        assert vehicle_of('demount') is None
        assert vehicle_of('otmetki_quick_demount') is None
        assert vehicle_of(None) is None

    def test_an_unknown_tier_has_a_question_mark(self):
        assert tier_numeral(0) == u'?'
        assert tier_numeral(11) == u'XI'


class DescriptorTest(unittest.TestCase):

    def test_both_languages_have_the_same_keys(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])

    def test_the_config_switch(self):
        assert SETTINGS == (SWITCH,)
        assert SWITCH == 'hangar_quick_demount'

    def test_the_settings_group(self):
        assert GROUP == 'hangar'


if __name__ == '__main__':
    unittest.main()
