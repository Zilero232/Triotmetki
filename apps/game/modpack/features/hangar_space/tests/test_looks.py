# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.hangar_space.i18n import STRINGS
from otmetki.features.hangar_space.model import (
    LOOKS,
    NAMED_GENERATED_LOOKS,
    Look,
    available_looks,
    build_page,
    chosen_target,
    environment_changes,
    environment_folder,
    environment_table,
    find_look,
    look_title,
    normalize_look,
    row_look,
    wanted_environments,
)
from otmetki.features.hangar_space.settings import SCHEMA

MAIN = 'h08_mt_hangar'
MAIN_PATH = 'spaces/h08_mt_hangar'
EVENT_PATH = 'spaces/h40_event'
STOCK_MAIN = ['h08_mt_hangar_Autumn_TD2', 'h08_mt_hangar_Autumn_TD3', 'h08_mt_hangar_Autumn_TD1', 'Customization']
STOCK_COMP7 = ['Customization', 'Night_N1_Light_shadow']
RAIN = Look('autumn_rain', MAIN, 'h08_mt_hangar_Autumn_TD3')


def translator():
    return _support.translator(STRINGS, 'ru')


def ids(looks):
    return [look.id for look in looks]


class EnvironmentTableTest(unittest.TestCase):

    def test_a_dotted_guid_is_its_folder_with_dashes(self):
        assert environment_folder(' 2F6C0AAA.490E4615.008EB7B0.9F58C206 ') == '2F6C0AAA-490E4615-008EB7B0-9F58C206'

    def test_the_names_keep_the_order_of_the_list(self):
        names, _ = environment_table([('A.1', 'TD2'), ('B.2', 'TD3'), ('C.3', 'Customization')], 'A.1')

        assert names == ['TD2', 'TD3', 'Customization']

    def test_the_active_guid_names_the_active_environment(self):
        _, active = environment_table([('A.1', 'TD2'), ('B.2', 'TD3')], ' b.2 ')

        assert active == 'TD3'

    def test_an_environment_without_a_name_is_left_out(self):
        names, active = environment_table([('A.1', ''), ('B.2', None)], 'A.1')

        assert names == []
        assert active == ''


class AvailableLooksTest(unittest.TestCase):

    def test_the_main_hangar_has_its_four_stock_looks(self):
        looks = available_looks([MAIN], {MAIN: STOCK_MAIN})

        assert ids(looks) == ['autumn', 'autumn_classic', 'autumn_rain', 'studio']

    def test_onslaught_night_needs_the_onslaught_space(self):
        looks = available_looks([MAIN, 'h33_comp7'], {MAIN: [], 'h33_comp7': STOCK_COMP7})

        assert ids(looks) == ['onslaught_night']

    def test_a_look_whose_environment_a_patch_removed_is_not_listed(self):
        looks = available_looks([MAIN], {MAIN: ['h08_mt_hangar_Winter_TD1', 'Customization']})

        assert ids(looks) == ['studio']

    def test_a_look_of_a_space_the_client_does_not_list_is_not_listed(self):
        looks = available_looks([], {MAIN: STOCK_MAIN})

        assert looks == []

    def test_a_generated_environment_is_a_look_named_after_it(self):
        looks = available_looks([MAIN], {MAIN: ['otm_night', 'otm_bad name']})

        assert looks == [Look('otm_night', MAIN, 'otm_night')]

    def test_a_generated_name_found_in_two_spaces_is_listed_once(self):
        looks = available_looks([MAIN, 'h33_comp7'], {MAIN: ['otm_night'], 'h33_comp7': ['otm_night']})

        assert [look.space for look in looks] == [MAIN]

    def test_every_stock_look_has_a_name_in_both_languages(self):
        for row in LOOKS:
            assert 'hangar_space_look_name_%s' % row[0] in STRINGS['ru']
            assert 'hangar_space_look_name_%s' % row[0] in STRINGS['en']

    def test_a_stock_look_shows_its_name(self):
        assert look_title(RAIN, translator()) == u'Осень: дождь'

    def test_every_named_generated_look_has_a_name_in_both_languages(self):
        for name in NAMED_GENERATED_LOOKS:
            assert 'hangar_space_look_name_%s' % name in STRINGS['ru']
            assert 'hangar_space_look_name_%s' % name in STRINGS['en']

    def test_our_generated_look_shows_its_name(self):
        assert look_title(Look('otm_night', MAIN, 'otm_night'), translator()) == u'Ночь ///'

    def test_a_generated_look_gets_a_title_from_its_environment(self):
        assert look_title(Look('otm_steel_grey', MAIN, 'otm_steel_grey'), translator()) == 'Steel grey'


class ChoiceTest(unittest.TestCase):

    def test_a_look_wins_over_the_chosen_space(self):
        assert chosen_target('h16_mt_museum', RAIN, [MAIN, 'h16_mt_museum']) == (MAIN_PATH, 'h08_mt_hangar_Autumn_TD3')

    def test_a_missing_look_leaves_the_chosen_space_without_an_environment(self):
        missing = find_look([RAIN], 'otm_gone')

        assert chosen_target('h16_mt_museum', missing, ['h16_mt_museum']) == ('spaces/h16_mt_museum', '')

    def test_without_a_choice_the_game_keeps_its_hangar(self):
        assert chosen_target('', None, [MAIN]) == (None, '')

    def test_a_look_row_names_its_look(self):
        assert row_look('look:autumn_rain') == 'autumn_rain'

    def test_a_space_row_is_not_a_look(self):
        assert row_look('h08_mt_hangar') is None
        assert row_look('look:../x') is None


class SettingsTest(unittest.TestCase):

    def test_the_game_look_is_the_default(self):
        assert Settings(None, SCHEMA).get('look') == ''

    def test_a_look_id_is_kept(self):
        assert Settings({'look': ' otm_Night '}, SCHEMA).get('look') == 'otm_Night'

    def test_junk_is_refused(self):
        assert normalize_look('a/b') is None
        assert Settings({'look': 'a b'}, SCHEMA).get('look') == ''


class EnvironmentSlotTest(unittest.TestCase):

    def test_the_environment_goes_where_the_slot_holds_the_look_space(self):
        wanted = wanted_environments({True: EVENT_PATH, False: 'Spaces/H08_mt_hangar'}, MAIN_PATH, 'TD3')

        assert wanted == {True: '', False: 'TD3'}

    def test_no_environment_empties_both_slots(self):
        assert wanted_environments({}, MAIN_PATH, '') == {True: '', False: ''}

    def test_empty_slots_take_ours(self):
        wanted = {True: 'TD3', False: 'TD3'}

        assert environment_changes({True: '', False: ''}, '', wanted) == wanted

    def test_an_environment_the_server_set_stays(self):
        assert environment_changes({True: 'Event', False: ''}, '', {True: 'TD3', False: 'TD3'}) == {False: 'TD3'}

    def test_ours_is_replaced_or_emptied(self):
        wanted = {True: '', False: 'TD1'}

        assert environment_changes({True: 'TD3', False: 'TD3'}, 'TD3', wanted) == wanted

    def test_nothing_changes_when_ours_is_in_place(self):
        assert environment_changes({True: 'TD3', False: None}, 'TD3', {True: 'TD3', False: ''}) == {}


class LookPageTest(unittest.TestCase):

    def page(self, look=u'', space=u''):
        return build_page([MAIN, 'h16_mt_museum'], space, MAIN, translator(), looks=[RAIN], look=look)

    def test_the_looks_come_between_the_game_hangar_and_the_spaces(self):
        rows = self.page()['rows']

        assert [row['id'] for row in rows] == ['native', 'look:autumn_rain', MAIN, 'h16_mt_museum']

    def test_a_look_row_says_it_is_a_look_of_its_space(self):
        row = self.page()['rows'][1]

        assert row['title'] == u'Осень: дождь'
        assert row['subtitle'] == u'Вид · Основной ангар'
        assert row['image'] is None

    def test_the_chosen_look_is_marked_and_the_game_hangar_is_not(self):
        rows = self.page(look='autumn_rain', space='h16_mt_museum')['rows']

        assert rows[1]['badge'] == u'Выбран'
        assert rows[1]['actions'] == []
        assert rows[0]['badge'] is None
        assert rows[3]['badge'] is None

    def test_a_missing_chosen_look_leaves_the_space_chosen(self):
        rows = self.page(look='otm_gone', space='h16_mt_museum')['rows']

        assert rows[1]['badge'] is None
        assert rows[3]['badge'] == u'Выбран'


if __name__ == '__main__':
    unittest.main()
