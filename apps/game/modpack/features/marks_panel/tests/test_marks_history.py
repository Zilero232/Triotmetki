# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from _support import MemoryFile
from otmetki.features.marks_panel.i18n import STRINGS
from otmetki.features.marks_panel.model.constants import HISTORY_FILE
from otmetki.features.marks_panel.model.history import MarksHistory, vehicle_label
from otmetki.features.marks_panel.model.page import build_page, page_actions

T0 = 1790000000


def battle(arena, rating, marks=2, avg=2600, damage=2000, radio=500, occurred=T0):
    return {
        'arena_unique_id': str(arena),
        'occurred_at': occurred,
        'result': 'win',
        'bonus_type': 1,
        'vehicle': {'tank_id': 1, 'name': 'ussr:R04_T-34', 'tier': 5},
        'stats': {'damage_dealt': damage, 'damage_assisted_radio': radio, 'damage_assisted_track': 100},
        'moe': {'damage_rating': rating, 'moving_avg_damage': avg, 'marks_on_gun': marks},
    }


def snapshot():
    return {
        'tank_id': 1,
        'name': 'ussr:R04_T-34',
        'tier': 5,
        'damage_rating': 8400,
        'moving_avg_damage': 2500,
        'marks_on_gun': 1,
    }


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def empty_history(store=None):
    return MarksHistory(store or MemoryFile(), max_entries=10)


def recorded_history(store=None):
    history = empty_history(store)
    history.record_snapshot(snapshot(), T0 - 100)
    history.record_battle(battle(1, 8520, marks=2, occurred=T0))
    history.record_battle(battle(2, 8610, occurred=T0 + 600), label=u'Т-34')
    return history


def two_battles():
    history = empty_history()
    history.record_battle(battle(1, 8400, marks=1, occurred=T0))
    history.record_battle(battle(2, 8520, marks=2, occurred=T0 + 600))
    return history


class StorageTest(unittest.TestCase):

    def test_the_history_keeps_the_file_of_the_former_component(self):
        assert HISTORY_FILE % 7 == 'marks_history_7.json'

    def test_a_saved_file_keeps_its_format(self):
        store = MemoryFile()

        recorded_history(store).save()

        assert sorted(store.read({})) == ['vehicles', 'version']

    def test_a_file_whose_vehicles_are_not_an_object_reads_empty(self):
        history = MarksHistory(MemoryFile({'vehicles': ['broken']}))

        assert history.vehicles == {}

    def test_a_file_that_is_not_an_object_reads_empty(self):
        history = MarksHistory(MemoryFile(['broken']))

        assert history.vehicles == {}


class VehicleLabelTest(unittest.TestCase):

    def test_the_label_drops_the_nation_and_the_item_code(self):
        assert vehicle_label('ussr:R04_T-34') == 'T-34'
        assert vehicle_label('germany:G89_Leopard1') == 'Leopard1'
        assert vehicle_label('usa:A120_M48A5') == 'M48A5'

    def test_no_name_is_an_empty_label(self):
        assert vehicle_label(None) == ''


class RecordTest(unittest.TestCase):

    def test_a_new_snapshot_is_recorded(self):
        history = empty_history()

        assert history.record_snapshot(snapshot(), T0 - 100) is not None

    def test_an_unchanged_snapshot_is_not_recorded_again(self):
        history = empty_history()
        history.record_snapshot(snapshot(), T0 - 100)

        assert history.record_snapshot(snapshot(), T0 - 50) is None

    def test_a_battle_is_recorded(self):
        history = empty_history()

        assert history.record_battle(battle(1, 8520, occurred=T0)) is not None

    def test_a_battle_that_does_not_count_for_marks_is_not_recorded(self):
        history = empty_history()

        assert history.record_battle(dict(battle(1, 8520, occurred=T0), bonus_type=7)) is None

    def test_a_battle_of_the_same_arena_is_recorded_once(self):
        history = empty_history()
        history.record_battle(battle(1, 8520, occurred=T0))

        assert history.record_battle(battle(1, 8520, occurred=T0)) is None

    def test_a_battle_without_dossier_values_is_not_recorded(self):
        history = empty_history()

        assert not history.record_battle({'vehicle': {'tank_id': 1}, 'moe': None})

    def test_a_vehicle_keeps_the_last_max_entries(self):
        history = empty_history()

        for index in range(15):
            history.record_battle(battle(index, 8000 + index, occurred=T0 + index))

        assert len(history.vehicle(1)['entries']) == 10


class SummaryTest(unittest.TestCase):

    def test_summary_of_the_recorded_battles(self):
        summary = recorded_history().summary(1, 5)

        assert summary['label'] == u'Т-34'
        assert summary['percent'] == 86.1
        assert summary['marks'] == 2
        assert summary['last_delta'] == 0.9
        assert summary['trend'] == 2.1
        assert summary['trend_battles'] == 2

    def test_summary_lists_the_change_of_each_battle_in_the_trend(self):
        summary = recorded_history().summary(1, 5)

        assert summary['deltas'] == [1.2, 0.9]

    def test_the_last_battle_counts_from_the_dossier_read_before_it(self):
        history = empty_history()
        history.record_snapshot(snapshot(), T0 - 100)
        history.record_snapshot(dict(snapshot(), damage_rating=8520), T0 - 10)
        history.record_battle(battle(1, 8520, occurred=T0), before=8400)

        assert history.summary(1, 5)['last_delta'] == 1.2

    def test_the_first_battle_of_a_tank_counts_when_its_start_is_known(self):
        history = empty_history()
        history.record_battle(battle(1, 8520, occurred=T0), before=8400)

        assert history.summary(1, 5)['deltas'] == [1.2]

    def test_the_trend_window_limits_the_changes(self):
        summary = recorded_history().summary(1, 1)

        assert summary['deltas'] == [0.9]

    def test_a_new_mark_is_dated_by_the_battle_that_reached_it(self):
        summary = recorded_history().summary(1, 5)

        assert summary['reached'] == {'2': T0}

    def test_a_saved_history_reads_back(self):
        store = MemoryFile()
        recorded_history(store).save()

        again = MarksHistory(store)

        assert again.summary(1, 1)['trend'] == 0.9

    def test_a_cleared_vehicle_has_no_summary(self):
        history = recorded_history()

        assert history.clear(1)
        assert history.summary(1, 5) is None


FIREBIRD = [
    {'arena': None, 'avg': 2605, 'marks': 0, 'rating': 6311, 'source': 'hangar', 't': 1790685912},
    {'arena': '29106557069013812', 'avg': 2668, 'marks': 0, 'rating': 64, 'source': 'battle', 't': 1790686301},
    {'arena': '26019991706648842', 'avg': 2718, 'marks': 1, 'rating': 65, 'source': 'battle', 't': 1790689874},
    {'arena': None, 'avg': 2751, 'marks': 1, 'rating': 6647, 'source': 'hangar', 't': 1790794178},
    {'arena': '20247267898121129', 'avg': 2809, 'before': 6647, 'marks': 1, 'rating': 67, 'source': 'battle',
     't': 1790795057},
]


def firebird_file():
    vehicle = {'label': u'Firebird', 'tier': 10, 'entries': [dict(entry) for entry in FIREBIRD], 'reached': {}}
    return MemoryFile({'version': 1, 'vehicles': {'7940641': vehicle}})


class RepairTest(unittest.TestCase):

    def test_the_battle_entries_stored_as_a_whole_percent_are_dropped(self):
        history = MarksHistory(firebird_file())

        ratings = [entry['rating'] for entry in history.vehicle(7940641)['entries']]

        assert ratings == [6311, 6647]

    def test_the_repair_counts_the_dropped_entries(self):
        assert MarksHistory(firebird_file()).repaired == 3

    def test_the_repaired_card_shows_the_dossier_percent(self):
        summary = MarksHistory(firebird_file()).summary(7940641, 5)

        assert summary['percent'] == 66.47

    def test_the_repaired_card_has_no_wrong_battle_change(self):
        summary = MarksHistory(firebird_file()).summary(7940641, 5)

        assert summary['last_delta'] is None

    def test_a_repaired_history_is_not_repaired_again(self):
        store = firebird_file()
        MarksHistory(store).save()

        assert MarksHistory(store).repaired == 0

    def test_a_brand_new_tank_under_one_percent_is_kept(self):
        history = empty_history()
        history.record_battle(battle(1, 80, marks=0, avg=300))
        history.record_battle(battle(2, 95, marks=0, avg=320))
        history.save()

        assert MarksHistory(history.store).repaired == 0


class GuardTest(unittest.TestCase):

    def test_a_battle_moving_the_percent_by_more_than_ten_is_not_recorded(self):
        history = empty_history()

        entry = history.record_battle(battle(1, 67), before=6647)

        assert entry is None

    def test_the_rejected_battle_says_why(self):
        history = empty_history()

        history.record_battle(battle(1, 67), before=6647)

        assert 'more than 10 %' in history.rejected

    def test_a_rating_past_one_hundred_percent_is_not_recorded(self):
        history = empty_history()

        history.record_battle(battle(1, 10001))

        assert 'outside' in history.rejected

    def test_an_impossible_change_shows_no_delta(self):
        history = empty_history()
        history.record_battle(battle(1, 8400, occurred=T0))
        history.vehicle(1)['entries'].append(dict(history.vehicle(1)['entries'][0], rating=5000, arena='2'))

        assert history.summary(1, 5)['last_delta'] is None


class CorrectionTest(unittest.TestCase):

    def test_the_hangar_read_after_a_battle_corrects_the_rounded_rating(self):
        history = empty_history()
        history.record_battle(battle(1, 6700, marks=1, avg=2809), before=6647)
        post_battle = dict(snapshot(), damage_rating=6689, moving_avg_damage=2809, marks_on_gun=1)

        history.record_snapshot(post_battle, T0 + 60)

        assert [entry['rating'] for entry in history.vehicle(1)['entries']] == [6689]

    def test_the_corrected_battle_counts_its_exact_change(self):
        history = empty_history()
        history.record_battle(battle(1, 6700, marks=1, avg=2809), before=6647)
        post_battle = dict(snapshot(), damage_rating=6689, moving_avg_damage=2809, marks_on_gun=1)
        history.record_snapshot(post_battle, T0 + 60)

        assert history.summary(1, 5)['last_delta'] == 0.42

    def test_a_later_hangar_read_with_another_average_is_a_new_entry(self):
        history = empty_history()
        history.record_battle(battle(1, 6700, marks=1, avg=2809), before=6647)

        history.record_snapshot(dict(snapshot(), damage_rating=6689, moving_avg_damage=2790, marks_on_gun=1), T0 + 60)

        assert len(history.vehicle(1)['entries']) == 2


class PageTest(unittest.TestCase):

    def test_a_vehicle_key_that_is_not_a_tank_id_is_left_off_the_page(self):
        history = two_battles()
        history.vehicles['junk'] = dict(history.vehicles['1'])

        rows = build_page(history, translator(), 5, 50)['rows']

        assert [row['id'] for row in rows] == ['1']

    def test_page_row_of_a_vehicle(self):
        row = build_page(two_battles(), translator(), 5, 50)['rows'][0]

        assert row['id'] == '1'
        assert row['title'] == 'T-34'
        assert row['badge'] == '+1.20%'
        assert row['actions'][0]['id'] == 'clear'

    def test_page_details_list_the_reached_marks_then_the_entries(self):
        details = build_page(two_battles(), translator(), 5, 50)['rows'][0]['details']

        assert details[0]['label'] == u'2-я отметка'
        assert '85.20%' in details[1]['value']
        assert '+1.20%' in details[1]['value']

    def test_an_empty_history_is_an_empty_page(self):
        page = build_page(empty_history(), translator(), 5, 50)

        assert page['rows'] == []
        assert page['empty']

    def test_the_page_links_the_site_progress(self):
        action = page_actions(translator())[0]

        assert action['link'] == '/me/progress'


class LastReadingTest(unittest.TestCase):

    def test_the_last_battle_stands_in_for_the_hangar_snapshot(self):
        reading = recorded_history().last_reading(1)

        assert reading == {'tank_id': 1, 'moving_avg_damage': 2600, 'damage_rating': 8610, 'marks_on_gun': 2}

    def test_a_tank_without_entries_has_no_reading(self):
        assert recorded_history().last_reading(99) is None


if __name__ == '__main__':
    unittest.main()
