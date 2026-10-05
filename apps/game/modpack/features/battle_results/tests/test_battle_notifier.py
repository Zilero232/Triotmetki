from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.features.battle_results.model.battle import notifier_decision, stock_notifier_shows

SHOWN = {'arena': True, 'server': True, 'option': True}


def reads(**changed):
    values = dict(SHOWN)
    values.update(changed)
    return values


class StockNotifierShowsTest(unittest.TestCase):

    def test_the_stock_notifier_shows_when_the_arena_the_server_and_the_option_all_have_it(self):
        assert stock_notifier_shows(SHOWN) is True

    def test_a_server_that_disables_it_leaves_the_card_to_us(self):
        assert stock_notifier_shows(reads(server=False)) is False

    def test_the_game_option_off_leaves_the_card_to_us(self):
        assert stock_notifier_shows(reads(option=False)) is False

    def test_a_battle_type_without_it_leaves_the_card_to_us(self):
        assert stock_notifier_shows(reads(arena=False)) is False

    def test_an_unreadable_condition_leaves_the_card_to_us(self):
        assert stock_notifier_shows(reads(option=None)) is False

    def test_no_reads_leave_the_card_to_us(self):
        assert stock_notifier_shows({}) is False


class NotifierDecisionTest(unittest.TestCase):

    def test_the_decision_says_our_card_stays_hidden_when_the_stock_one_shows(self):
        assert 'our card stays hidden' in notifier_decision(SHOWN)

    def test_the_decision_says_our_card_shows_when_the_stock_one_does_not(self):
        assert 'our card shows' in notifier_decision(reads(server=False))

    def test_the_decision_names_every_read(self):
        line = notifier_decision(reads(option=None))

        assert 'arena=True server=True option=None' in line


if __name__ == '__main__':
    unittest.main()
