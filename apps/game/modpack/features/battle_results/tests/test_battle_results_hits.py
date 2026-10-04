# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.battle_results.i18n import STRINGS
from otmetki.features.battle_results.model import build_page
from otmetki.features.battle_results.model.hits import HitBook, figure_of, figure_point, impact, side_of, summary
from otmetki.features.battle_results.model.hits.constants import MAX_HITS
from otmetki.features.battle_results.settings import SCHEMA


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def segment(part, code, start, end):
    value = code | (part << 8)
    for shift, byte in zip((16, 24, 32, 40, 48, 56), tuple(start) + tuple(end)):
        value |= byte << shift
    return value


class MemoryStore(object):

    def __init__(self, data=None):
        self.data = data

    def read(self, default=None):
        return self.data if self.data is not None else default

    def write(self, data):
        self.data = data


FRONT_HULL_PEN = segment(1, 4, (120, 100, 250), (130, 110, 255))
LEFT_TURRET_RICOCHET = segment(2, 2, (0, 128, 120), (10, 128, 130))
TURRET_CRIT = segment(2, 5, (100, 100, 100), (110, 110, 110))
TRACK_BLOCKED = segment(5, 3, (240, 20, 100), (250, 30, 110))
POINT_WITHOUT_LENGTH = segment(1, 4, (5, 5, 5), (5, 5, 5))
UNKNOWN_EFFECT = segment(1, 9, (1, 1, 1), (2, 2, 2))
STORED_HIT = {
    'part': 'hull',
    'outcome': 'pen',
    'x': 0.4,
    'y': 0.5,
    'z': 0.9,
    'attacker': 'Pz. IV',
    'class': 'medium',
    'damage': 390,
}


def started_book(store=None, keep=10):
    book = HitBook(store if store is not None else MemoryStore(), keep)
    book.start(123, u'T-34', 100.0)
    return book


def book_with_battles(count, keep):
    book = HitBook(MemoryStore(), keep)
    for index in range(count):
        book.start(index, 'T-34', float(index))
        book.hit([FRONT_HULL_PEN], 'x', None, float(index))
        book.finish()
    return book


def two_shot_battle(store):
    book = started_book(store)
    book.hit([FRONT_HULL_PEN], 'Pz. IV', 'mediumTank', 100.0)
    book.damage('Pz. IV', 390, 100.2)
    book.damage('KV-1', 240, 101.0)
    book.hit([TURRET_CRIT], 'KV-1', 'heavyTank', 101.1)
    book.hit([LEFT_TURRET_RICOCHET], 'KV-1', 'heavyTank', 110.0)
    return book


def hand_edited_store():
    garbled_hit = dict(STORED_HIT, x='left', z=3.0, attacker=['x'], damage=-5, **{'class': 'tank'})
    return MemoryStore({'battles': [
        {'hits': [STORED_HIT]},
        {'id': 'no-hits', 'hits': [{'part': 'engine', 'outcome': 'pen'}, {'part': 'hull', 'outcome': 'boom'}, 'x']},
        {'id': 5, 'vehicle': 7, 't': 'noon', 'hits': [garbled_hit, STORED_HIT]},
    ]})


def sample_book():
    book = HitBook(MemoryStore(), 5)
    book.start(77, u'T-34', 1790000000.0)
    book.hit([FRONT_HULL_PEN], 'Pz. IV', 'mediumTank', 1.0)
    book.damage('Pz. IV', 390, 1.1)
    book.hit([LEFT_TURRET_RICOCHET], 'KV-1', 'heavyTank', 5.0)
    book.hit([TRACK_BLOCKED], 'KV-1', 'heavyTank', 9.0)
    book.finish()
    return book


def sample_battle():
    return sample_book().battles[-1]


def hits_page(book, language='ru', show_attacker=True, entries=()):
    return build_page(list(entries), translator(language), 3600, hit_battles=book.battles, show_attacker=show_attacker)


def summary_entry(arena, time):
    return {'arena': arena, 'time': time, 'result': 'win', 'vehicle': u'T-34', 'map': u'Малиновка', 'damage': 1200}


class ImpactTest(unittest.TestCase):

    def test_takes_the_last_point_of_a_shot(self):
        found = impact([LEFT_TURRET_RICOCHET, FRONT_HULL_PEN])

        assert found == ('hull', 'pen', (0.49, 0.412, 0.99))

    def test_a_track_index_is_the_chassis(self):
        part, _, _ = impact([TRACK_BLOCKED])

        assert part == 'chassis'

    def test_skips_points_without_length_and_unknown_effects(self):
        assert impact([POINT_WITHOUT_LENGTH, UNKNOWN_EFFECT]) is None

    def test_no_points_is_no_impact(self):
        assert impact(None) is None


class SideTest(unittest.TestCase):

    def test_the_front_of_the_hull(self):
        assert side_of('hull', 0.5, 0.9) == 'front'

    def test_the_rear_of_the_hull(self):
        assert side_of('hull', 0.5, 0.1) == 'rear'

    def test_the_left_side_of_the_turret(self):
        assert side_of('turret', 0.1, 0.5) == 'left'

    def test_the_right_side_of_the_turret(self):
        assert side_of('turret', 0.9, 0.5) == 'right'

    def test_the_chassis_has_no_side(self):
        assert side_of('chassis', 0.1, 0.9) is None


class HitBookTest(unittest.TestCase):

    def test_a_hit_before_the_battle_starts_is_not_recorded(self):
        book = HitBook(MemoryStore(), 10)

        recorded = book.hit([FRONT_HULL_PEN], 'Pz. IV')

        assert not recorded

    def test_damage_that_arrives_after_the_hit_joins_it(self):
        book = started_book()
        book.hit([FRONT_HULL_PEN], 'Pz. IV', 'mediumTank', 100.0)

        joined = book.damage('Pz. IV', 390, 100.2)

        assert joined
        assert book.current['hits'][0]['damage'] == 390

    def test_damage_that_arrives_before_the_hit_waits_for_it(self):
        book = started_book()

        joined = book.damage('KV-1', 240, 101.0)
        book.hit([TURRET_CRIT], 'KV-1', 'heavyTank', 101.1)

        assert not joined
        assert book.current['hits'][0]['damage'] == 240

    def test_finish_returns_the_battle_with_each_hit_and_its_damage(self):
        book = two_shot_battle(MemoryStore())

        battle = book.finish()

        outcomes = [(hit['part'], hit['outcome'], hit['damage']) for hit in battle['hits']]
        assert outcomes == [('hull', 'pen', 390), ('turret', 'crit', 240), ('turret', 'ricochet', 0)]

    def test_a_finished_hit_keeps_the_attacker_class_and_drops_its_time(self):
        book = two_shot_battle(MemoryStore())

        first = book.finish()['hits'][0]

        assert first['class'] == 'medium'
        assert 'at' not in first

    def test_a_saved_battle_reads_back(self):
        store = MemoryStore()
        book = two_shot_battle(store)
        book.finish()
        book.save()

        again = HitBook(store, 10)

        assert again.battles[-1]['id'] == '123'
        assert len(again.battles[-1]['hits']) == 3

    def test_keeps_only_the_last_battles(self):
        book = book_with_battles(4, 2)

        ids = [battle['id'] for battle in book.battles]

        assert ids == ['2', '3']

    def test_a_battle_without_hits_is_not_kept(self):
        book = book_with_battles(1, 2)
        book.start(9, 'T-34', 9.0)

        finished = book.finish()

        assert finished is None
        assert len(book.battles) == 1

    def test_clear_removes_every_battle(self):
        book = book_with_battles(2, 2)

        book.clear()

        assert book.battles == []

    def test_resize_drops_the_oldest_battles(self):
        book = book_with_battles(2, 2)

        book.resize(1)

        assert [battle['id'] for battle in book.battles] == ['1']

    def test_caps_the_hits_of_one_battle(self):
        book = started_book(keep=5)

        for index in range(MAX_HITS + 3):
            book.hit([FRONT_HULL_PEN], 'x', None, float(index))

        assert len(book.current['hits']) == MAX_HITS


class StoredBookTest(unittest.TestCase):

    def test_a_file_that_is_not_a_book_reads_as_empty(self):
        assert HitBook(MemoryStore(['nonsense']), 5).battles == []

    def test_battles_without_hits_read_as_empty(self):
        assert HitBook(MemoryStore({'battles': [{'id': 'x'}, 'y']}), 5).battles == []

    def test_battles_that_are_not_a_list_read_as_empty(self):
        assert HitBook(MemoryStore({'battles': {'id': 'x'}}), 5).battles == []

    def test_reads_back_only_the_battles_with_an_id_and_a_valid_hit(self):
        book = HitBook(hand_edited_store(), 5)

        assert [battle['id'] for battle in book.battles] == ['5']

    def test_a_bad_vehicle_and_time_read_as_unknown(self):
        battle = HitBook(hand_edited_store(), 5).battles[-1]

        assert battle['vehicle'] is None
        assert battle['t'] is None

    def test_bad_hit_fields_read_as_defaults(self):
        battle = HitBook(hand_edited_store(), 5).battles[-1]

        assert battle['hits'][0] == {
            'part': 'hull',
            'outcome': 'pen',
            'x': 0.5,
            'y': 0.5,
            'z': 1.0,
            'attacker': None,
            'class': None,
            'damage': 0,
        }

    def test_a_well_formed_hit_reads_back_unchanged(self):
        battle = HitBook(hand_edited_store(), 5).battles[-1]

        assert battle['hits'][1] == STORED_HIT

    def test_a_battle_read_back_without_a_vehicle_shows_a_question_mark(self):
        row = hits_page(HitBook(hand_edited_store(), 5))['rows'][0]

        assert row['id'] == '5'
        assert row['title'] == u'?'


class SummaryTest(unittest.TestCase):

    def test_counts_the_hits_and_the_damage(self):
        stats = summary(sample_battle())

        assert stats['hits'] == 3
        assert stats['damage'] == 390

    def test_counts_each_outcome(self):
        stats = summary(sample_battle())

        assert stats['counts'] == {'pen': 1, 'crit': 0, 'blocked': 1, 'ricochet': 1, 'nodamage': 0}

    def test_counts_the_parts_and_their_sides(self):
        stats = summary(sample_battle())

        assert stats['parts']['chassis'] == 1
        assert stats['sides']['hull']['front'] == 1
        assert stats['sides']['turret']['left'] == 1


class FigureTest(unittest.TestCase):

    def test_draws_every_shape_of_the_schematic(self):
        figure = figure_of(sample_battle())

        assert len(figure['shapes']) == 5
        assert figure['shapes'][2] == {'x': 0.2, 'y': 0.1, 'w': 0.6, 'h': 0.82}

    def test_a_front_hull_hit_sits_at_the_top_of_the_hull(self):
        hull_hit = sample_battle()['hits'][0]

        assert figure_point(hull_hit) == (0.494, 0.108)

    def test_a_right_track_hit_sits_on_the_right_track(self):
        track_hit = sample_battle()['hits'][2]

        assert figure_point(track_hit) == (0.929, 0.577)

    def test_each_mark_carries_its_outcome(self):
        figure = figure_of(sample_battle())

        assert [mark['tone'] for mark in figure['marks']] == ['pen', 'ricochet', 'blocked']


class PageTest(unittest.TestCase):

    def test_a_row_names_the_battle_and_its_vehicle(self):
        row = hits_page(sample_book())['rows'][0]

        assert row['id'] == '77'
        assert row['title'] == u'T-34'

    def test_the_subtitle_counts_the_hits_by_outcome(self):
        row = hits_page(sample_book())['rows'][0]

        assert row['subtitle'] == u'Попаданий 3: пробитий 1, не пробили 1, рикошетов 1'

    def test_the_meta_ends_with_the_damage_taken(self):
        row = hits_page(sample_book())['rows'][0]

        assert row['meta'].endswith(u' · урон 390')

    def test_the_first_detail_counts_the_parts_and_sides(self):
        row = hits_page(sample_book())['rows'][0]

        assert row['details'][0]['value'] == u'Корпус: лоб 1 · Башня: левый борт 1 · Ходовая 1'

    def test_a_hit_line_names_the_place_the_outcome_the_damage_and_the_attacker(self):
        row = hits_page(sample_book())['rows'][0]

        assert row['details'][1] == {'label': u'1', 'value': u'Корпус, лоб · пробитие · −390 · Pz. IV'}

    def test_a_hit_line_leaves_out_the_attacker_when_asked(self):
        row = hits_page(sample_book(), 'en', show_attacker=False)['rows'][0]

        assert row['details'][1]['value'] == u'Hull, front · penetrated · −390'

    def test_a_row_carries_the_schematic(self):
        row = hits_page(sample_book())['rows'][0]

        assert len(row['figure']['marks']) == 3
        assert row['actions'] == []


class MergedPageTest(unittest.TestCase):

    def test_the_battle_row_of_the_same_arena_carries_the_hits(self):
        page = hits_page(sample_book(), entries=[summary_entry(77, 1790000400)])

        battle = page['rows'][1]
        assert [row['id'] for row in page['rows']] == ['session', '77']
        assert len(battle['figure']['marks']) == 3

    def test_the_hits_follow_the_battle_details_under_their_heading(self):
        battle = hits_page(sample_book(), entries=[summary_entry(77, 1790000400)])['rows'][1]

        labels = [item['label'] for item in battle['details']]
        heading = labels.index(u'Попадания по мне')
        assert battle['details'][heading]['value'] == u'Попаданий 3: пробитий 1, не пробили 1, рикошетов 1'
        assert labels[heading + 1:] == [u'По частям', u'1', u'2', u'3']

    def test_a_battle_without_hits_has_no_schematic(self):
        battle = hits_page(HitBook(MemoryStore(), 5), entries=[summary_entry(77, 1790000400)])['rows'][1]

        assert 'figure' not in battle

    def test_hits_without_a_summary_sit_among_the_battles_by_time(self):
        entries = [summary_entry(1, 1789990000), summary_entry(2, 1790009000)]

        page = hits_page(sample_book(), entries=entries)

        assert [row['id'] for row in page['rows']] == ['session', '2', '77', '1']

    def test_no_hits_tab_leaves_the_battles_as_they_are(self):
        page = build_page([summary_entry(77, 1790000400)], translator(), 3600)

        assert 'figure' not in page['rows'][1]


class SettingsTest(unittest.TestCase):

    def test_the_hits_tab_is_on_by_default(self):
        assert SCHEMA.defaults['hits_tab'] is True

    def test_keeps_ten_battles_of_hits(self):
        assert 'hits_keep_battles' not in SCHEMA.defaults
        assert Settings({'hits_keep_battles': 30}, SCHEMA).get('hits_keep_battles') == 10

    def test_names_the_attacker_by_default(self):
        assert SCHEMA.defaults['hits_show_attacker'] is True


if __name__ == '__main__':
    unittest.main()
