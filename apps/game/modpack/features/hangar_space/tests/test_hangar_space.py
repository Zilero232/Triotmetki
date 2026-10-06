# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.hangar_space.i18n import STRINGS
from otmetki.features.hangar_space.model import (
    KNOWN_SPACES,
    PLAN_LATER,
    PLAN_LOADED,
    PLAN_RELOAD,
    PLAN_WAIT,
    available_space,
    build_page,
    listed_spaces,
    normalize_space,
    override_changes,
    readable_title,
    reload_plan,
    space_name,
    space_names,
    space_path,
    space_preview,
    space_title,
)
from otmetki.features.hangar_space.settings import ADVANCED, SCHEMA, SETTINGS

OURS = 'spaces/h30_newyear_2025'
EVENT = 'spaces/h40_event'


def translator():
    return _support.translator(STRINGS, 'ru')


class NamesTest(unittest.TestCase):

    def test_a_space_name_is_its_folder_in_lower_case(self):
        assert space_name('Spaces/H08_MT_Hangar') == 'h08_mt_hangar'

    def test_paths_outside_the_spaces_folder_are_not_spaces(self):
        assert space_names(['DEFAULT', 'spaces/', 'spaces/a b', None, 'spaces/b', 'spaces/a', 'spaces/a']) == ['a', 'b']

    def test_a_name_becomes_its_path(self):
        assert space_path('h08_mt_hangar') == 'spaces/h08_mt_hangar'
        assert space_path(u'') is None


class SettingsTest(unittest.TestCase):

    def test_an_empty_choice_keeps_the_game_hangar(self):
        assert Settings(None, SCHEMA).get('space') == u''

    def test_a_folder_name_is_kept_in_lower_case(self):
        assert Settings({'space': ' H08_MT_Hangar '}, SCHEMA).get('space') == 'h08_mt_hangar'

    def test_a_path_or_junk_is_refused(self):
        assert normalize_space('../spaces/x') is None
        assert Settings({'space': 'a/b'}, SCHEMA).get('space') == u''

    def test_the_component_switch_is_hangar_space(self):
        assert SETTINGS == ('hangar_space',)

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


class OverridesTest(unittest.TestCase):

    def test_the_choice_fills_both_empty_slots(self):
        assert override_changes({}, None, OURS) == {True: OURS, False: OURS}

    def test_an_event_hangar_of_the_server_stays(self):
        assert override_changes({True: EVENT, False: None}, None, OURS) == {False: OURS}

    def test_the_own_choice_is_replaced_or_dropped(self):
        assert override_changes({True: OURS, False: OURS}, OURS, None) == {True: None, False: None}

    def test_nothing_changes_when_the_choice_is_in_place(self):
        assert override_changes({True: OURS, False: OURS}, OURS, OURS) == {}


class AvailableSpaceTest(unittest.TestCase):

    def test_a_space_the_client_has_is_kept(self):
        assert available_space('h16_mt_museum', ['h08_mt_hangar', 'h16_mt_museum']) == 'h16_mt_museum'

    def test_a_folder_the_client_lacks_keeps_the_game_hangar(self):
        assert available_space('h99_typo', ['h08_mt_hangar', 'h16_mt_museum']) is None

    def test_without_the_client_list_nothing_is_written(self):
        assert available_space('h16_mt_museum', []) is None

    def test_the_game_hangar_stays_the_game_hangar(self):
        assert available_space('', ['h08_mt_hangar']) is None


class TitlesTest(unittest.TestCase):

    def test_every_known_space_has_a_name_in_both_languages(self):
        for name in KNOWN_SPACES:
            assert 'hangar_space_name_%s' % name in STRINGS['ru']
            assert 'hangar_space_name_%s' % name in STRINGS['en']

    def test_a_known_space_shows_its_name(self):
        assert space_title('h16_mt_museum', translator()) == u'Музей славы'

    def test_an_unknown_space_gets_a_title_from_its_folder(self):
        assert readable_title('h30_mt_newyear_2025') == u'Newyear 2025'
        assert readable_title('h40_event') == u'Event'
        assert space_title('hangar_premium', translator()) == u'Hangar premium'

    def test_a_folder_of_only_a_number_keeps_its_name(self):
        assert readable_title('h12_') == u'h12_'

    def test_developer_and_test_spaces_are_not_listed(self):
        names = ['h08_mt_hangar', 'hangar_mt_lite_editor', '1006_3d_styles_test', 'h30_newyear']

        assert listed_spaces(names) == ['h08_mt_hangar', 'h30_newyear']

    def test_known_spaces_come_first_in_their_order(self):
        assert listed_spaces(['a', 'h16_mt_museum', 'h08_mt_hangar']) == ['h08_mt_hangar', 'h16_mt_museum', 'a']

    def test_a_space_with_event_art_has_a_preview(self):
        assert space_preview('h14_mt_wt_2025').startswith('img://')
        assert space_preview('h08_mt_hangar') is None
        assert space_preview(u'') is None


class ReloadPlanTest(unittest.TestCase):

    def test_the_default_hangar_reloads_to_another_space(self):
        assert reload_plan(True, True, 'spaces/h16_mt_museum', 'spaces/h08_mt_hangar') == PLAN_RELOAD

    def test_the_space_already_loaded_needs_no_reload(self):
        assert reload_plan(True, True, 'spaces/H16_mt_museum', 'spaces/h16_mt_museum') == PLAN_LOADED

    def test_a_space_still_loading_is_waited_for(self):
        assert reload_plan(True, False, 'spaces/h16_mt_museum', None) == PLAN_WAIT

    def test_a_mode_or_event_hangar_waits_for_the_regular_one(self):
        assert reload_plan(False, True, 'spaces/h16_mt_museum', 'spaces/h33_comp7') == PLAN_LATER


class PageTest(unittest.TestCase):

    def test_the_page_starts_with_the_game_hangar(self):
        rows = build_page(['a', 'b'], 'b', 'a', translator())['rows']

        assert [row['id'] for row in rows] == ['native', 'a', 'b']

    def test_the_page_is_a_gallery_with_a_note(self):
        page = build_page(['a'], u'', 'a', translator())

        assert page['layout'] == 'gallery'
        assert page['note'].startswith(u'Ангар и вид меняются сразу')

    def test_the_chosen_space_has_no_choose_button(self):
        rows = build_page(['a', 'b'], 'b', 'a', translator())['rows']

        assert rows[2]['actions'] == []
        assert rows[1]['badge'] == u'Сейчас'

    def test_a_row_shows_the_name_the_folder_and_the_picture(self):
        row = build_page(['h14_mt_wt_2025'], u'', None, translator())['rows'][1]

        assert row['title'] == u'Белый тигр'
        assert row['subtitle'] == 'h14_mt_wt_2025'
        assert row['image'].startswith('img://')

    def test_the_chosen_space_loaded_now_says_so(self):
        row = build_page(['a'], 'a', 'a', translator())['rows'][1]

        assert row['badge'] == u'Выбран'
        assert row['meta'] == u'Сейчас загружен'

    def test_the_folder_and_look_fields_are_advanced(self):
        assert ADVANCED == ('space', 'look')


if __name__ == '__main__':
    unittest.main()
