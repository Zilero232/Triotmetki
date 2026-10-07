from __future__ import absolute_import, division, print_function, unicode_literals

import os
import unittest

import _support
from otmetki.companion.binding import Credentials
from otmetki.companion.config import DEFAULTS as COMPANION_DEFAULTS
from otmetki.core.errors import ReasonError
from otmetki.features.pack_badge.model import (
    ArenaPlayer,
    BattleBadges,
    asked_account_ids,
    badges_request,
    is_anonymised,
    library_action,
    marked_vehicle_ids,
    parse_badges,
    show_own,
)
from otmetki.features.pack_badge.model.constants import (
    FLASH_MARK,
    LIBRARY_ADD,
    LIBRARY_REMOVE,
    LIBRARY_SWF,
    MAX_ACCOUNT_IDS,
)

OWN = 1000
CREDENTIALS = Credentials('dev_badge', 'q' * 43, OWN)
ARENA = 4242


def player(account_id, name='Tanker', fake_name='', is_bot=False):
    return ArenaPlayer(account_id=account_id, name=name, fake_name=fake_name, is_bot=is_bot)


class IsAnonymisedTest(unittest.TestCase):

    def test_a_fake_name_other_than_the_name_is_anonymised(self):
        self.assertTrue(is_anonymised('Tanker', 'Player123'))

    def test_the_same_name_is_not_anonymised(self):
        self.assertFalse(is_anonymised('Tanker', 'Tanker'))

    def test_no_fake_name_is_not_anonymised(self):
        self.assertFalse(is_anonymised('Tanker', ''))


class AskedAccountIdsTest(unittest.TestCase):

    def test_asks_every_other_real_player_once(self):
        players = [player(OWN), player(2), player(3), player(2)]

        self.assertEqual(asked_account_ids(players, OWN), [2, 3])

    def test_leaves_out_bots_and_ids_that_are_no_accounts(self):
        players = [player(0), player(None), player(4, is_bot=True), player(5)]

        self.assertEqual(asked_account_ids(players, OWN), [5])

    def test_never_sends_the_real_id_of_an_anonymised_player(self):
        players = [player(6, name='RealName', fake_name='Anon'), player(7)]

        self.assertEqual(asked_account_ids(players, OWN), [7])

    def test_stops_at_the_contract_limit(self):
        players = [player(account_id) for account_id in range(1, MAX_ACCOUNT_IDS + 20)]

        self.assertEqual(len(asked_account_ids(players, OWN)), MAX_ACCOUNT_IDS)


class BadgesRequestTest(unittest.TestCase):

    def test_carries_the_device_and_the_account_ids_only(self):
        body = badges_request(CREDENTIALS, [2, 3])

        self.assertEqual(body, {'device_id': 'dev_badge', 'account_id': OWN, 'account_ids': [2, 3]})

    def test_matches_the_contract(self):
        validator = _support.schema_validator('badges.schema.json', 'request')
        if validator is None:
            self.skipTest('jsonschema is not installed')

        body = badges_request(CREDENTIALS, [2, 3])

        self.assertEqual(list(validator.iter_errors(body)), [])

    def test_is_not_built_without_players(self):
        with self.assertRaises(ReasonError):
            badges_request(CREDENTIALS, [])

    def test_is_not_built_without_a_binding(self):
        with self.assertRaises(ReasonError):
            badges_request(None, [2])


class ParseBadgesTest(unittest.TestCase):

    def test_keeps_only_the_asked_accounts(self):
        marked = parse_badges({'account_ids': [2, 9, 'x']}, frozenset([2, 3]))

        self.assertEqual(marked, frozenset([2]))

    def test_a_malformed_answer_marks_nobody(self):
        self.assertEqual(parse_badges({'account_ids': 'all'}, frozenset([2])), frozenset())
        self.assertEqual(parse_badges(None, frozenset([2])), frozenset())

    def test_the_contract_example_parses(self):
        example = _support.load_json(os.path.join(_support.CONTRACT_DIR, 'examples', 'badges.example.json'))

        marked = parse_badges(example, frozenset(example['account_ids']))

        self.assertEqual(marked, frozenset(example['account_ids']))


class ShowOwnTest(unittest.TestCase):

    def test_the_default_config_shows_the_own_badge(self):
        self.assertTrue(show_own(COMPANION_DEFAULTS))

    def test_the_switch_off_hides_it(self):
        self.assertFalse(show_own(dict(COMPANION_DEFAULTS, show_pack_badge=False)))


class MarkedVehicleIdsTest(unittest.TestCase):

    def test_names_the_vehicles_of_marked_accounts(self):
        vehicles = [(11, OWN), (12, 2), (13, 3)]

        self.assertEqual(marked_vehicle_ids(vehicles, frozenset([OWN, 3])), [11, 13])

    def test_is_sorted_and_has_each_vehicle_once(self):
        vehicles = [(14, 2), (12, 2), (14, 2)]

        self.assertEqual(marked_vehicle_ids(vehicles, frozenset([2])), [12, 14])

    def test_leaves_out_ids_that_are_no_vehicles(self):
        vehicles = [(0, 2), (None, 2), ('15', 2), (16, 2)]

        self.assertEqual(marked_vehicle_ids(vehicles, frozenset([2])), [16])

    def test_marks_nothing_without_marked_accounts(self):
        self.assertEqual(marked_vehicle_ids([(11, OWN)], frozenset()), [])


class LibraryActionTest(unittest.TestCase):

    def test_the_switch_on_adds_a_missing_library(self):
        self.assertEqual(library_action(['windows.swf'], 'ours.swf', True), LIBRARY_ADD)

    def test_the_switch_on_never_adds_it_twice(self):
        self.assertIsNone(library_action(['ours.swf'], 'ours.swf', True))

    def test_the_switch_off_removes_it(self):
        self.assertEqual(library_action(['ours.swf'], 'ours.swf', False), LIBRARY_REMOVE)

    def test_the_switch_off_leaves_the_stock_list(self):
        self.assertIsNone(library_action(['windows.swf'], 'ours.swf', False))


class ShippingTest(unittest.TestCase):

    def test_the_battle_drawing_is_off_by_default(self):
        self.assertFalse(COMPANION_DEFAULTS['battle_pack_badge'])

    def test_the_library_swf_ships_in_the_package(self):
        path = os.path.join(_support.MODPACK_DIR, 'features', 'pack_badge', 'flash', LIBRARY_SWF)

        self.assertTrue(os.path.isfile(path))

    def test_the_library_swf_is_uncompressed(self):
        path = os.path.join(_support.MODPACK_DIR, 'features', 'pack_badge', 'flash', LIBRARY_SWF)

        with open(path, 'rb') as handle:
            self.assertEqual(handle.read(3), b'FWS')

    def test_the_library_defines_the_page_function_python_calls(self):
        path = os.path.join(_support.MODPACK_DIR, 'as3', 'src', 'net', 'triotmetki', 'packbadge', 'PackBadgeLibrary.as')

        with open(path, 'rb') as handle:
            self.assertIn(('prototype.%s = ' % FLASH_MARK).encode('ascii'), handle.read())


class BattleBadgesTest(unittest.TestCase):

    def test_marks_the_own_account_from_the_start(self):
        badges = BattleBadges()

        badges.start(ARENA, OWN)

        self.assertEqual(badges.marked, frozenset([OWN]))

    def test_marks_nobody_without_an_own_badge(self):
        badges = BattleBadges()

        badges.start(ARENA, None)

        self.assertEqual(badges.marked, frozenset())

    def test_adds_the_answer_of_this_battle(self):
        badges = BattleBadges()
        badges.start(ARENA, OWN)

        changed = badges.answered(ARENA, frozenset([2]))

        self.assertTrue(changed)
        self.assertEqual(badges.marked, frozenset([OWN, 2]))

    def test_drops_an_answer_for_another_battle(self):
        badges = BattleBadges()
        badges.start(ARENA, OWN)

        changed = badges.answered(ARENA + 1, frozenset([2]))

        self.assertFalse(changed)
        self.assertEqual(badges.marked, frozenset([OWN]))

    def test_forgets_everything_when_the_battle_ends(self):
        badges = BattleBadges()
        badges.start(ARENA, OWN)
        badges.answered(ARENA, frozenset([2]))

        badges.stop()

        self.assertEqual(badges.marked, frozenset())


if __name__ == '__main__':
    unittest.main()
