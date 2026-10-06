from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.own_result import own_result, own_vehicle


def results(winner, team=1):
    personal = {'avatar': {'team': team}, 123: {'typeCompDescr': 1, 'team': team}}
    return {'common': {'winnerTeam': winner}, 'personal': personal}


class OwnResultTest(unittest.TestCase):

    def test_the_own_team_winning_is_a_win(self):
        assert own_result(results(1)) == 'win'

    def test_the_other_team_winning_is_a_loss(self):
        assert own_result(results(2)) == 'loss'

    def test_no_winner_is_a_draw(self):
        assert own_result(results(0)) == 'draw'

    def test_results_without_a_team_say_nothing(self):
        assert own_result({'common': {'winnerTeam': 1}}) is None

    def test_the_avatar_team_stands_in_for_a_vehicle_entry_without_one(self):
        data = {'common': {'winnerTeam': 2}, 'personal': {'avatar': {'team': 2}, 5: [{'typeCompDescr': 1}]}}

        assert own_result(data) == 'win'

    def test_results_that_are_no_dict_say_nothing(self):
        assert own_result(None) is None


class OwnVehicleTest(unittest.TestCase):

    def test_the_first_entry_of_a_list_is_the_vehicle(self):
        assert own_vehicle({'avatar': {}, 7: [{'typeCompDescr': 9, 'team': 1}]}) == {'typeCompDescr': 9, 'team': 1}

    def test_no_vehicle_entry_is_an_empty_dict(self):
        assert own_vehicle({'avatar': {'team': 1}}) == {}


if __name__ == '__main__':
    unittest.main()
