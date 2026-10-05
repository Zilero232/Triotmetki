# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.companion.payload import build_battle_event
from otmetki.core.format import strip_tags
from otmetki.core.settings import Settings
from otmetki.features.battle_results.i18n import STRINGS
from otmetki.features.battle_results.model import (
    build_page,
    build_summary,
    compact,
    counts,
    format_summary,
    page_actions,
    restore_history,
    session_of,
    signed,
    trimmed,
)
from otmetki.features.battle_results.model.constants import ACTION_HITS
from otmetki.features.battle_results.settings import SCHEMA

MOE_BEFORE = {'tank_id': 1, 'damage_rating': 8600, 'moving_avg_damage': 2550, 'marks_on_gun': 1}
BATTLE_INFO = {'vehicle_name': 'T-34', 'vehicle_tier': 5, 'map_name': '02_malinovka'}
FIXTURE_ARENA = '1152921504606847123'
TWO_HOURS = 2 * 3600


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def battle_event():
    return build_battle_event(_support.battle_results(), BATTLE_INFO)


def battle_event_with_costs():
    event = battle_event()
    event['stats'].update({'repair_cost': 4200, 'ammo_cost': 1800, 'consumables_cost': 3000, 'free_xp': 57})
    return event


def summary_after_marks():
    return build_summary(battle_event(), MOE_BEFORE, 'Малиновка')


def history_entry():
    return compact(build_summary(battle_event_with_costs(), MOE_BEFORE, 'Малиновка'))


def two_hours_later_loss(entry):
    return dict(entry, arena='2', time=entry['time'] + TWO_HOURS, result='loss', damage=300, moe_delta=-0.4)


def history():
    first = history_entry()
    return [first, two_hours_later_loss(first)]


def details_of(row):
    return dict((item['label'], item['value']) for item in row['details'])


class BuildSummaryTest(unittest.TestCase):

    def test_takes_the_result_and_the_translated_map(self):
        summary = summary_after_marks()

        assert summary['result'] == 'win'
        assert summary['map'] == 'Малиновка'
        assert summary['vehicle'] == 'T-34'
        assert summary['tier'] == 5

    def test_takes_the_economy(self):
        summary = summary_after_marks()

        assert summary['xp'] == 1150
        assert summary['credits'] == 48000

    def test_takes_the_combat_stats(self):
        summary = summary_after_marks()

        assert summary['damage'] == 2150
        assert summary['blocked'] == 900
        assert summary['frags'] == 2
        assert summary['spotted'] == 3

    def test_assist_is_radio_plus_track_plus_stun(self):
        summary = summary_after_marks()

        assert summary['assist_radio'] == 640
        assert summary['assist_track'] == 310
        assert summary['assist_stun'] == 0
        assert summary['assist'] == 950

    def test_marks_change_against_the_hangar_values(self):
        summary = summary_after_marks()

        assert summary['moe_percent'] == 87.00
        assert summary['moe_delta'] == 1.0
        assert summary['moving_avg_delta'] == 60
        assert summary['marks_delta'] == 1

    def test_without_hangar_values_falls_back_to_the_map_name_and_no_deltas(self):
        summary = build_summary(battle_event())

        assert summary['map'] == '02_malinovka'
        assert summary['moe_delta'] is None
        assert summary['moving_avg_delta'] is None
        assert summary['marks_delta'] is None

    def test_a_battle_that_does_not_count_for_marks_gives_no_deltas(self):
        event = dict(battle_event(), bonus_type=7)

        summary = build_summary(event, MOE_BEFORE, 'Малиновка')

        assert summary['moe_delta'] is None
        assert summary['moving_avg_delta'] is None
        assert summary['marks_delta'] is None

    def test_a_zero_rating_before_gives_no_moe_delta(self):
        summary = build_summary(battle_event(), dict(MOE_BEFORE, damage_rating=0))

        assert summary['moe_delta'] is None

    def test_an_empty_event_gives_zeros_and_no_marks(self):
        summary = build_summary({'result': 'loss'})

        assert summary['moe_percent'] is None
        assert summary['damage'] == 0
        assert summary['vehicle'] == ''
        assert summary['alive'] is False

    def test_net_credits_subtract_repair_ammo_and_consumables(self):
        summary = build_summary(battle_event_with_costs(), MOE_BEFORE, 'Малиновка')

        assert summary['net_credits'] == 39000

    def test_takes_the_shooting_and_free_xp(self):
        summary = build_summary(battle_event_with_costs(), MOE_BEFORE, 'Малиновка')

        assert summary['shots'] == 12
        assert summary['hits'] == 9
        assert summary['pens'] == 7
        assert summary['free_xp'] == 57
        assert summary['life_time'] == 380
        assert summary['duration'] == 402


class CountsTest(unittest.TestCase):

    def test_a_random_battle_counts_for_random_only(self):
        assert counts(summary_after_marks(), 'random')

    def test_another_battle_type_does_not_count_for_random_only(self):
        summary = dict(summary_after_marks(), bonus_type=7)

        assert not counts(summary, 'random')

    def test_every_battle_type_counts_for_all(self):
        summary = dict(summary_after_marks(), bonus_type=7)

        assert counts(summary, 'all')


class SignedTest(unittest.TestCase):

    def test_a_positive_percent_gets_a_plus(self):
        assert signed(1.5, True) == '+1.50%'

    def test_a_negative_number_keeps_its_minus(self):
        assert signed(-60) == '-60'

    def test_zero_has_no_sign(self):
        assert signed(0) == '0'

    def test_nothing_is_an_empty_string(self):
        assert signed(None) == ''


class FormatSummaryTest(unittest.TestCase):

    def test_default_settings_show_every_section_in_colour(self):
        text = format_summary(summary_after_marks(), Settings({}, SCHEMA), translator())

        assert text.split('\n') == [
            '<font color="#7CD35B">Три отметки: победа — T-34, Малиновка</font>',
            'Опыт 1 150, кредиты 48 000',
            'Урон 2 150, помощь 950, заблокировано 900, уничтожено 2, обнаружено 3',
            'Отметка 87.00%, отметок 2 (<font color="#7CD35B">+1.00%</font>), '
            'средний урон <font color="#7CD35B">+60</font>',
        ]

    def test_only_the_marks_section(self):
        settings = Settings({'show_economy': False, 'show_combat': False}, SCHEMA)
        summary = build_summary(battle_event(), MOE_BEFORE)

        text = strip_tags(format_summary(summary, settings, translator('en')))

        assert text == 'Three Marks: victory — T-34, 02_malinovka\nMoE 87.00%, marks 2 (+1.00%), average damage +60'

    def test_marks_section_is_left_out_without_a_moe(self):
        settings = Settings({'show_economy': False, 'show_combat': False}, SCHEMA)
        summary = build_summary({'result': 'loss'})

        text = strip_tags(format_summary(summary, settings, translator('en')))

        assert text == 'Three Marks: defeat — , '

    def test_custom_template_fills_the_macros(self):
        settings = Settings({'template': '{result}: {damage} ({moe_percent} {moe_delta})'}, SCHEMA)
        summary = build_summary(battle_event(), MOE_BEFORE)

        text = format_summary(summary, settings, translator('en'))

        assert text == 'victory: 2 150 (87.00% +1.00%)'

    def test_strings_are_in_sync(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


class HistoryTest(unittest.TestCase):

    def test_compact_entry_keeps_no_other_players(self):
        entry = history_entry()

        assert 'players' not in entry
        assert 'vehicles' not in entry

    def test_compact_entry_keeps_the_extended_stats(self):
        entry = history_entry()

        assert entry['net_credits'] == 39000
        assert entry['free_xp'] == 57
        assert entry['pens'] == 7

    def test_restore_keeps_only_entries(self):
        assert restore_history([{'arena': '1'}, 'junk', None]) == [{'arena': '1'}]

    def test_restore_of_something_else_is_empty(self):
        assert restore_history({'arena': '1'}) == []

    def test_restore_scales_a_whole_percent_stored_as_hundredths(self):
        stored = [{'arena': '1', 'marks_on_gun': 0, 'moe_percent': 0.64, 'moe_delta': -62.47}]

        assert restore_history(stored)[0]['moe_percent'] == 64.0

    def test_restore_drops_the_impossible_change(self):
        stored = [{'arena': '1', 'marks_on_gun': 0, 'moe_percent': 0.64, 'moe_delta': -62.47}]

        assert restore_history(stored)[0]['moe_delta'] is None

    def test_restore_scales_a_percent_under_one_on_a_tank_with_a_mark(self):
        stored = [{'arena': '1', 'marks_on_gun': 1, 'moe_percent': 0.8, 'moe_delta': None}]

        assert restore_history(stored)[0]['moe_percent'] == 80.0

    def test_restore_keeps_a_real_percent(self):
        stored = [{'arena': '1', 'marks_on_gun': 1, 'moe_percent': 66.47, 'moe_delta': 0.42}]

        assert restore_history(stored) == stored

    def test_trimmed_keeps_the_newest_entries(self):
        assert trimmed([1, 2, 3, 4], 2) == [3, 4]

    def test_trimmed_keeps_a_shorter_history(self):
        assert trimmed([1, 2], 5) == [1, 2]

    def test_history_size_is_limited(self):
        assert Settings({'history_size': 1000}, SCHEMA).get('history_size') == 100


class SessionOfTest(unittest.TestCase):

    def test_a_gap_longer_than_idle_splits_the_session(self):
        entries = history()

        assert session_of(entries, 3600) == entries[1:]

    def test_a_gap_within_idle_keeps_one_session(self):
        entries = history()

        assert session_of(entries, 3 * 3600) == entries

    def test_no_battles_is_no_session(self):
        assert session_of([], 60) == []


class BuildPageTest(unittest.TestCase):

    def test_rows_are_the_session_then_the_battles_newest_first(self):
        page = build_page(history(), translator(), 3600)

        assert [row['id'] for row in page['rows']] == ['session', '2', FIXTURE_ARENA]

    def test_a_battle_the_hit_viewer_has_gets_its_button(self):
        rows = build_page(history(), translator(), 3600, viewer_battles=frozenset(['2']))['rows']

        assert [action['id'] for action in rows[1]['actions']] == [ACTION_HITS]

    def test_a_battle_the_hit_viewer_lacks_gets_no_button(self):
        rows = build_page(history(), translator(), 3600, viewer_battles=frozenset(['2']))['rows']

        assert rows[2]['actions'] == []

    def test_the_hits_button_names_the_viewer(self):
        rows = build_page(history(), translator(), 3600, viewer_battles=frozenset(['2']))['rows']

        assert rows[1]['actions'][0]['label'] == 'Посмотреть попадания'

    def test_session_row_sums_up_the_current_session(self):
        session = build_page(history(), translator(), 3600)['rows'][0]

        assert session['title'] == 'Сессия: 1 боёв'
        assert session['subtitle'] == 'Победы 0.0% · ср. урон 300 · ср. помощь 950 · ср. опыт 1 150'
        assert session['meta'] == 'Кредиты за вычетом ремонта и пополнения: 39 000'

    def test_battle_row_shows_the_result_and_the_moe_change(self):
        latest = build_page(history(), translator(), 3600)['rows'][1]

        assert latest['title'] == 'поражение — T-34, Малиновка'
        assert latest['subtitle'] == 'Урон 300 · помощь 950 · фраги 2 · опыт 1 150'
        assert latest['badge'] == '-0.40%'

    def test_battle_row_details_carry_every_stat(self):
        earlier = build_page(history(), translator(), 3600)['rows'][2]

        assert details_of(earlier) == {
            'Урон': '2 150',
            'Помощь (разведка / гусеница / оглушение)': '950 (640 / 310 / 0)',
            'Заблокировано бронёй': '900',
            'Уничтожено / обнаружено': '2 / 3',
            'Выстрелы / попадания / пробития': '12 / 9 / 7',
            'Опыт (свободный)': '1 150 (57)',
            'Кредиты': '48 000',
            'Ремонт / снаряды / снаряжение': '4 200 / 1 800 / 3 000',
            'Кредиты за вычетом расходов': '39 000',
            'Время жизни / длительность боя': '06:20 / 06:42',
            'Отметка': '87.00% (+1.00%)',
        }

    def test_battle_row_without_a_moe_has_no_moe_detail_nor_badge(self):
        entry = dict(history_entry(), moe_percent=None, moe_delta=None, time=None)

        row = build_page([entry], translator(), 3600)['rows'][1]

        assert 'Отметка' not in details_of(row)
        assert row['badge'] is None
        assert row['meta'] is None

    def test_no_battles_is_an_empty_list(self):
        page = build_page([], translator('en'), 3600)

        assert page['rows'] == []
        assert page['empty'] == 'No battles yet: summaries appear after your first battle.'

    def test_actions_are_the_site_link_and_clear(self):
        actions = page_actions(translator())

        assert [action['id'] for action in actions] == ['site', 'clear']


if __name__ == '__main__':
    unittest.main()
