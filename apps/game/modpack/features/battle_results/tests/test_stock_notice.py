# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.companion.payload import build_battle_event
from otmetki.core.format import strip_tags
from otmetki.core.settings import Settings
from otmetki.features.battle_results.i18n import STRINGS
from otmetki.features.battle_results.model import APPEND, HOLD, PUSH, StockNotices, build_summary, stock_lines
from otmetki.features.battle_results.model import with_lines
from otmetki.features.battle_results.model.constants import NOTICE_ARENAS_LIMIT, STOCK_WAIT_S, UNCLAIMED_AFTER_S
from otmetki.features.battle_results.settings import SCHEMA

MOE_BEFORE = {'tank_id': 1, 'damage_rating': 8600, 'moving_avg_damage': 2550, 'marks_on_gun': 1}
BATTLE_INFO = {'vehicle_name': 'T-34', 'vehicle_tier': 5, 'map_name': '02_malinovka'}
ARENA = 7


def summary():
    return build_summary(build_battle_event(_support.battle_results(), BATTLE_INFO), MOE_BEFORE, 'Малиновка')


def lines(**values):
    settings = Settings(values, SCHEMA)
    return [strip_tags(line) for line in stock_lines(summary(), settings, _support.translator(STRINGS, 'ru'))]


class StockLinesTest(unittest.TestCase):

    def test_the_lines_leave_out_what_the_stock_message_names(self):
        text = u'\n'.join(lines())

        self.assertNotIn(u'Три отметки', text)

    def test_the_lines_carry_the_combat_numbers_and_the_marks(self):
        found = lines()

        self.assertEqual([line.split(' ')[0] for line in found], [u'Урон', u'Отметка'])

    def test_a_template_replaces_the_lines(self):
        found = lines(template='{vehicle}')

        self.assertEqual(found, [u'T-34'])


class WithLinesTest(unittest.TestCase):

    def test_text_gets_the_lines_under_it(self):
        self.assertEqual(with_lines(u'Победа!', [u'Урон 1']), u'Победа!\nУрон 1')

    def test_bytes_get_the_lines_as_utf8(self):
        self.assertEqual(with_lines(u'Победа!'.encode('utf-8'), [u'Урон 1']), u'Победа!\nУрон 1'.encode('utf-8'))

    def test_no_lines_leave_the_message(self):
        self.assertEqual(with_lines(u'Победа!', []), u'Победа!')


class StockNoticesTest(unittest.TestCase):

    def setUp(self):
        self.notices = StockNotices()
        self.delivered = []

    def deliver(self, found):
        self.delivered.append(found)

    def test_held_results_go_into_the_stock_message(self):
        self.notices.results_arrived(ARENA, 'results')

        self.assertEqual(self.notices.stock_arrived(ARENA, self.deliver, 0), 'results')

    def test_results_after_the_message_append_to_it(self):
        self.notices.stock_arrived(ARENA, self.deliver, 0)

        action, deliver = self.notices.results_arrived(ARENA, 'results')

        self.assertEqual((action, deliver), (APPEND, self.deliver))

    def test_results_wait_for_their_message(self):
        action, _ = self.notices.results_arrived(ARENA, 'results')

        self.assertEqual(action, HOLD)

    def test_a_message_waits_only_so_long(self):
        self.notices.stock_arrived(ARENA, self.deliver, 0)

        delivers, _ = self.notices.expired(STOCK_WAIT_S)

        self.assertEqual(delivers, [self.deliver])

    def test_results_after_a_released_message_get_their_own(self):
        self.notices.stock_arrived(ARENA, self.deliver, 0)
        self.notices.expired(STOCK_WAIT_S)

        action, _ = self.notices.results_arrived(ARENA, 'results')

        self.assertEqual(action, PUSH)

    def test_unclaimed_results_come_back_a_while_after_the_hangar_opened(self):
        self.notices.results_arrived(ARENA, 'results')
        self.notices.entered_hangar(100)

        _, unclaimed = self.notices.expired(100 + UNCLAIMED_AFTER_S)

        self.assertEqual(unclaimed, ['results'])

    def test_held_results_stay_while_in_battle(self):
        self.notices.results_arrived(ARENA, 'results')
        self.notices.entered_hangar(100)
        self.notices.left_hangar()

        _, unclaimed = self.notices.expired(100 + UNCLAIMED_AFTER_S)

        self.assertEqual(unclaimed, [])


class WaitingLimitTest(unittest.TestCase):

    def setUp(self):
        self.notices = StockNotices()
        self.delivered = []
        for arena in range(NOTICE_ARENAS_LIMIT + 1):
            self.notices.stock_arrived(arena, self.deliverer(arena), 0.0)

    def deliverer(self, arena):
        return lambda found: self.delivered.append((arena, found))

    def test_the_oldest_waiting_message_is_let_out_unchanged(self):
        self.assertEqual(self.delivered, [(0, [])])

    def test_the_results_of_a_message_let_out_go_to_the_notification(self):
        action, _deliver = self.notices.results_arrived(0, 'results')

        self.assertEqual(action, PUSH)


class ArenaKeyTest(unittest.TestCase):

    def test_the_stock_message_arena_meets_the_results_text_id(self):
        notices = StockNotices()
        delivered = []
        notices.stock_arrived(ARENA, delivered.extend, 0.0)

        action, deliver = notices.results_arrived(str(ARENA), summary())
        deliver([u'line'])

        self.assertEqual(action, APPEND)
        self.assertEqual(delivered, [u'line'])

    def test_results_held_by_their_text_id_go_to_the_stock_message(self):
        notices = StockNotices()
        held = summary()
        notices.results_arrived(str(ARENA), held)

        self.assertIs(notices.stock_arrived(ARENA, None, 0.0), held)


if __name__ == '__main__':
    unittest.main()
