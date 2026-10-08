# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.comp7_helper.i18n import STRINGS
from otmetki.features.comp7_helper.model import format_hangar
from otmetki.features.comp7_helper.model.battles import (
    clean_history,
    own_battle,
    record,
    recent_text,
    streak,
    streak_text,
    strip,
)
from otmetki.features.comp7_helper.model.constants import KEPT_BATTLES
from otmetki.features.comp7_helper.model.widget import hangar_widget
from otmetki.features.comp7_helper.settings import SCHEMA

COMP7_BONUS_TYPE = 43
RANDOM_BONUS_TYPE = 1


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def results(winner=1, team=1, bonus_type=COMP7_BONUS_TYPE, delta=25):
    return {
        'common': {'bonusType': bonus_type, 'winnerTeam': winner, 'arenaCreateTime': 1000},
        'personal': {
            'avatar': {'team': team, 'comp7RatingDelta': delta},
            '5137': [{'typeCompDescr': 5137, 'team': team}],
        },
    }


def battle(arena, result, delta=None):
    return {'arena': arena, 'result': result, 'delta': delta, 't': arena}


def state(history):
    return {
        'division': None,
        'divisions': [],
        'qualification': True,
        'skill': None,
        'battles': history,
    }


class OwnBattleTest(unittest.TestCase):

    def test_an_onslaught_win_is_read_with_its_rating_change(self):
        assert own_battle(7, results()) == {'arena': 7, 'result': 'win', 'delta': 25, 't': 1000}

    def test_a_loss_and_a_draw(self):
        assert own_battle(7, results(winner=2))['result'] == 'loss'
        assert own_battle(7, results(winner=0))['result'] == 'draw'

    def test_other_battle_types_are_left_out(self):
        assert own_battle(7, results(bonus_type=RANDOM_BONUS_TYPE)) is None

    def test_broken_results_are_left_out(self):
        assert own_battle(7, None) is None
        assert own_battle(None, results()) is None
        assert own_battle(7, {'common': {'bonusType': COMP7_BONUS_TYPE}}) is None


class HistoryTest(unittest.TestCase):

    def test_a_battle_is_recorded_once(self):
        history = record([], battle(1, 'win'))

        assert record(history, battle(1, 'win')) is history

    def test_only_the_newest_battles_are_kept(self):
        history = []
        for arena in range(KEPT_BATTLES + 3):
            history = record(history, battle(arena, 'win'))

        assert len(history) == KEPT_BATTLES
        assert history[0]['arena'] == 3

    def test_results_that_arrive_late_take_their_battle_place(self):
        history = record([battle(2, 'win')], battle(1, 'loss'))

        assert [entry['arena'] for entry in history] == [1, 2]

    def test_a_late_loss_does_not_end_the_newer_winning_run(self):
        history = [battle(2, 'win'), battle(3, 'win')]

        history = record(history, battle(1, 'loss'))

        assert streak(history) == ('win', 2)

    def test_a_stored_file_is_read_in_battle_order(self):
        history = clean_history([battle(3, 'win'), battle(1, 'loss')])

        assert [entry['arena'] for entry in history] == [1, 3]

    def test_a_stored_file_is_cleaned(self):
        assert clean_history([battle(1, 'win'), {'result': 'maybe'}, None]) == [battle(1, 'win')]
        assert clean_history({'a': 1}) == []


class StreakTest(unittest.TestCase):

    def test_the_run_the_newest_battle_ends(self):
        history = [battle(1, 'loss'), battle(2, 'win'), battle(3, 'win')]

        assert streak(history) == ('win', 2)

    def test_a_draw_ends_every_run(self):
        assert streak([battle(1, 'win'), battle(2, 'draw')]) == (None, 0)
        assert streak([]) == (None, 0)

    def test_the_streak_line_counts_in_words(self):
        history = [battle(1, 'loss'), battle(2, 'loss'), battle(3, 'loss'), battle(4, 'loss'), battle(5, 'loss')]

        assert streak_text(history, translator()) == u'Серия: 5 поражений подряд'

    def test_the_recent_line_shows_the_last_five_and_the_rating_change(self):
        history = [battle(arena, 'win', 10) for arena in range(1, 4)] + [battle(4, 'loss', -20), battle(5, 'draw')]
        history = [battle(0, 'loss', 99)] + history

        assert recent_text(history, translator('en')) == u'Last battles: +++-=, rating +10'

    def test_the_strip_has_a_tone_per_battle(self):
        assert strip([battle(1, 'win'), battle(2, 'loss'), battle(3, 'draw')]) == ['good', 'bad', 'muted']


class CardTest(unittest.TestCase):

    def test_the_card_lists_the_streak_and_the_last_battles(self):
        history = [battle(1, 'win', 20), battle(2, 'win', 15)]

        widget = hangar_widget(state(history), Settings({}, SCHEMA), translator('en'))

        texts = [row['text'] for row in widget['data']['rows'] if row]
        assert u'Streak: 2 wins in a row' in texts
        assert widget['data']['strip'] == ['good', 'good']

    def test_the_battles_switched_off_leave_no_card_when_nothing_else_shows(self):
        history = [battle(1, 'win', 20)]
        settings = Settings({'show_battles': False}, SCHEMA)

        assert hangar_widget(state(history), settings, translator()) is None
        assert format_hangar(state(history), settings, translator()) is None


if __name__ == '__main__':
    unittest.main()
