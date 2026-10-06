# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.hit_book import BattleBook, is_battle_id, keep_count, near, part_of, text_or_none


class Store(object):

    def __init__(self, data=None):
        self.data = data

    def read(self, default=None):
        return default if self.data is None else self.data

    def write(self, data):
        self.data = data


class Book(BattleBook):

    max_hits = 3

    def clean_stored(self, battle):
        return battle if isinstance(battle, dict) and battle.get('id') else None

    def damage_key(self, entry):
        return entry['who']

    def start(self):
        self.open({'id': 'b', 'hits': []})

    def hit(self, who, outcome, at):
        self.add_hit({'who': who, 'outcome': outcome, 'damage': 0, 'at': at})


class HelpersTest(unittest.TestCase):

    def test_moments_within_the_damage_window_are_near(self):
        assert near(10.0, 10.9)
        assert not near(10.0, 11.5)

    def test_an_unknown_moment_is_near_anything(self):
        assert near(None, 3.0)
        assert near(3.0, None)

    def test_the_kept_battles_stay_between_one_and_thirty(self):
        assert [keep_count(value) for value in (0, 5, 99)] == [1, 5, 30]

    def test_track_and_wheel_indices_count_as_the_chassis(self):
        assert [part_of(index) for index in (0, 1, 2, 3, 7, -1)] == ['chassis', 'hull', 'turret', 'gun', 'chassis',
                                                                     'chassis']

    def test_a_battle_id_is_a_number_or_non_empty_text(self):
        assert is_battle_id(12)
        assert is_battle_id('12')
        assert not is_battle_id('')
        assert not is_battle_id(None)

    def test_text_or_none_keeps_only_non_empty_strings(self):
        assert text_or_none(b'T-34') == 'T-34'
        assert text_or_none('') is None
        assert text_or_none(5) is None


class BattleBookTest(unittest.TestCase):

    def test_reads_back_only_the_battles_the_subclass_accepts(self):
        book = Book(Store({'battles': [{'id': 'a', 'hits': []}, {'hits': []}]}), 5)
        assert [battle['id'] for battle in book.battles] == ['a']

    def test_a_damaged_store_reads_as_empty(self):
        assert Book(Store(['broken']), 5).battles == []

    def test_damage_reported_first_goes_to_the_next_damaging_hit(self):
        book = Book(None, 5)
        book.start()
        assert not book.add_damage('x', 120, 1.0)
        book.hit('x', 'pen', 1.2)
        assert book.current['hits'][0]['damage'] == 120

    def test_damage_reported_after_the_hit_fills_it(self):
        book = Book(None, 5)
        book.start()
        book.hit('x', 'crit', 1.0)
        assert book.add_damage('x', 90, 1.5)
        assert book.current['hits'][0]['damage'] == 90

    def test_damage_of_another_shooter_or_too_late_waits(self):
        book = Book(None, 5)
        book.start()
        book.hit('x', 'pen', 1.0)
        assert not book.add_damage('y', 90, 1.1)
        assert not book.add_damage('x', 90, 5.0)
        assert book.current['hits'][0]['damage'] == 0

    def test_a_blocked_hit_takes_no_damage(self):
        book = Book(None, 5)
        book.start()
        book.add_damage('x', 50, 1.0)
        book.hit('x', 'blocked', 1.0)
        assert book.current['hits'][0]['damage'] == 0

    def test_has_room_until_the_hit_limit(self):
        book = Book(None, 5)
        assert not book.has_room()
        book.start()
        for _ in range(3):
            assert book.has_room()
            book.hit('x', 'ricochet', 1.0)
        assert not book.has_room()

    def test_finish_strips_the_moments_and_keeps_the_last_battles(self):
        book = Book(None, 2)
        for _ in range(3):
            book.start()
            book.hit('x', 'pen', 1.0)
            book.finish()
        assert len(book.battles) == 2
        assert 'at' not in book.battles[-1]['hits'][0]

    def test_a_battle_without_hits_is_not_kept(self):
        book = Book(None, 5)
        book.start()
        assert book.finish() is None
        assert book.battles == []

    def test_save_writes_the_versioned_battles(self):
        store = Store()
        book = Book(store, 5)
        book.start()
        book.hit('x', 'pen', 1.0)
        book.finish()
        book.save()
        assert store.data == {'version': 1, 'battles': book.battles}

    def test_resize_and_clear(self):
        book = Book(Store({'battles': [{'id': 'a'}, {'id': 'b'}, {'id': 'c'}]}), 5)
        book.resize(1)
        assert [battle['id'] for battle in book.battles] == ['c']
        book.clear()
        assert book.battles == []


if __name__ == '__main__':
    unittest.main()
