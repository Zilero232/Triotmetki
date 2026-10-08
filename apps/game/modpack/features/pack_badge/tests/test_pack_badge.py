from __future__ import absolute_import, division, print_function, unicode_literals

import io
import os
import struct
import unittest

import _support
from otmetki.companion.config import DEFAULTS as COMPANION_DEFAULTS
from otmetki.core.errors import ReasonError
from otmetki.features.pack_badge.model import (
    ArenaPlayer,
    BadgeSwitch,
    BattleBadges,
    arena_names,
    asked_account_ids,
    is_anonymised,
    library_action,
    marked_vehicle_ids,
    parse_badges,
    presence_request,
    show_own,
    status_lines,
)
from otmetki.features.pack_badge.model.constants import (
    FLASH_CLEAR,
    FLASH_MARK,
    LIBRARY_ADD,
    LIBRARY_REMOVE,
    LIBRARY_SWF,
    MAX_ACCOUNT_IDS,
    MAX_LOOKUPS,
)

OWN = 1000
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


class PresenceRequestTest(unittest.TestCase):

    def test_carries_the_own_account_the_switch_and_the_account_ids_only(self):
        body = presence_request(OWN, True, [2, 3])

        self.assertEqual(body, {'account_id': OWN, 'visible': True, 'account_ids': [2, 3]})

    def test_the_own_switch_off_is_sent_as_not_visible(self):
        self.assertFalse(presence_request(OWN, False, [2])['visible'])

    def test_matches_the_contract(self):
        validator = _support.schema_validator('badges.schema.json', 'presence')
        if validator is None:
            self.skipTest('jsonschema is not installed')

        errors = list(validator.iter_errors(presence_request(OWN, False, [2, 3])))

        self.assertEqual(errors, [])

    def test_an_empty_battle_matches_the_contract(self):
        validator = _support.schema_validator('badges.schema.json', 'presence')
        if validator is None:
            self.skipTest('jsonschema is not installed')

        errors = list(validator.iter_errors(presence_request(OWN, True, [])))

        self.assertEqual(errors, [])

    def test_is_built_without_other_players(self):
        self.assertEqual(presence_request(OWN, True, [])['account_ids'], [])

    def test_is_not_built_without_the_own_account(self):
        with self.assertRaises(ReasonError):
            presence_request(None, True, [2])


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


def arena_player(account_id, name, fake_name=''):
    return ArenaPlayer(account_id=account_id, name=name, fake_name=fake_name, is_bot=False)


class ArenaNamesTest(unittest.TestCase):

    def test_names_the_players_of_marked_accounts(self):
        players = [arena_player(OWN, 'Own'), arena_player(2, 'Other'), arena_player(3, 'Friend')]

        names, _ = arena_names(players, frozenset([OWN, 3]))

        self.assertEqual(names, ['Friend', 'Own'])

    def test_names_every_other_player_apart(self):
        players = [arena_player(OWN, 'Own'), arena_player(2, 'Other'), arena_player(3, 'Friend')]

        _, other_names = arena_names(players, frozenset([OWN, 3]))

        self.assertEqual(other_names, ['Other'])

    def test_an_anonymised_player_is_found_by_both_names(self):
        players = [arena_player(OWN, 'Own', fake_name='Hidden')]

        names, _ = arena_names(players, frozenset([OWN]))

        self.assertEqual(names, ['Hidden', 'Own'])

    def test_each_name_goes_once(self):
        players = [arena_player(2, b'Twin', fake_name=b'Twin'), arena_player(2, 'Twin')]

        names, _ = arena_names(players, frozenset([2]))

        self.assertEqual(names, ['Twin'])

    def test_names_go_as_text(self):
        players = [arena_player(2, b'Twin')]

        names, _ = arena_names(players, frozenset([2]))

        self.assertIsInstance(names[0], type(u''))

    def test_a_name_both_marked_and_not_counts_as_marked(self):
        players = [arena_player(2, 'Twin'), arena_player(3, 'Twin')]

        _, other_names = arena_names(players, frozenset([2]))

        self.assertEqual(other_names, [])

    def test_leaves_out_empty_names(self):
        names, _ = arena_names([arena_player(2, None), arena_player(2, '')], frozenset([2]))

        self.assertEqual(names, [])

    def test_names_nobody_marked_without_marked_accounts(self):
        names, _ = arena_names([arena_player(OWN, 'Own')], frozenset())

        self.assertEqual(names, [])


class LibraryActionTest(unittest.TestCase):

    def test_the_switch_on_adds_a_missing_library(self):
        self.assertEqual(library_action(['windows.swf'], 'ours.swf', True), LIBRARY_ADD)

    def test_the_switch_on_never_adds_it_twice(self):
        self.assertIsNone(library_action(['ours.swf'], 'ours.swf', True))

    def test_the_switch_off_removes_it(self):
        self.assertEqual(library_action(['ours.swf'], 'ours.swf', False), LIBRARY_REMOVE)

    def test_the_switch_off_leaves_the_stock_list(self):
        self.assertIsNone(library_action(['windows.swf'], 'ours.swf', False))


class StatusLinesTest(unittest.TestCase):

    def test_splits_the_answer_into_one_line_per_screen(self):
        status = 'panel rows 30, marked 2 | tab rows 30, marked 2 | loading not found | art bitmap'

        self.assertEqual(status_lines(status), [
            'panel rows 30, marked 2', 'tab rows 30, marked 2', 'loading not found', 'art bitmap',
        ])

    def test_no_answer_is_no_lines(self):
        self.assertEqual(status_lines(None), [])

    def test_an_error_answer_is_one_line(self):
        self.assertEqual(status_lines('error boom'), ['error boom'])


BITMAP_TAGS = frozenset((6, 20, 21, 35, 36, 90))
SCALEFORM_SWF_VERSION = 10


def library_path():
    return os.path.join(_support.MODPACK_DIR, 'features', 'pack_badge', 'flash', LIBRARY_SWF)


def swf_tags(data):
    rect_bits = 5 + (bytearray(data[8:9])[0] >> 3) * 4
    position = 8 + (rect_bits + 7) // 8 + 4
    codes = []
    while position < len(data):
        head, = struct.unpack(str('<H'), data[position:position + 2])
        length = head & 0x3f
        position += 2
        if length == 0x3f:
            length, = struct.unpack(str('<I'), data[position:position + 4])
            position += 4
        codes.append(head >> 6)
        position += length
    return codes


class ShippingTest(unittest.TestCase):

    def setUp(self):
        with io.open(library_path(), 'rb') as library:
            self.swf = library.read()

    def test_the_battle_drawing_is_on_by_default(self):
        self.assertTrue(COMPANION_DEFAULTS['battle_pack_badge'])

    def test_the_library_is_an_uncompressed_swf(self):
        self.assertEqual(self.swf[:3], b'FWS')

    def test_the_library_targets_the_scaleform_player(self):
        self.assertLessEqual(bytearray(self.swf[3:4])[0], SCALEFORM_SWF_VERSION)

    def test_the_library_embeds_no_bitmaps(self):
        self.assertFalse(BITMAP_TAGS.intersection(swf_tags(self.swf)))

    def test_the_library_swf_is_uncompressed(self):
        path = os.path.join(_support.MODPACK_DIR, 'features', 'pack_badge', 'flash', LIBRARY_SWF)

        with open(path, 'rb') as handle:
            self.assertEqual(handle.read(3), b'FWS')

    def test_the_library_defines_the_page_functions_python_calls(self):
        path = os.path.join(_support.MODPACK_DIR, 'as3', 'src', 'net', 'triotmetki', 'packbadge', 'PackBadgeLibrary.as')

        with open(path, 'rb') as handle:
            source = handle.read()

        for name in (FLASH_MARK, FLASH_CLEAR):
            self.assertIn(('prototype.%s = ' % name).encode('ascii'), source)


class BattleBadgesTest(unittest.TestCase):

    def started(self, visible=True):
        badges = BattleBadges()
        badges.start(ARENA, OWN, visible)
        return badges

    def test_marks_the_own_account_from_the_start(self):
        self.assertEqual(self.started().marked, frozenset([OWN]))

    def test_marks_nobody_without_an_own_badge(self):
        self.assertEqual(self.started(visible=False).marked, frozenset())

    def test_the_first_lookup_asks_every_player(self):
        self.assertEqual(self.started().lookup([2, 3]), [2, 3])

    def test_the_first_lookup_goes_out_with_nobody_to_ask_to_record_the_own_badge(self):
        self.assertEqual(self.started().lookup([]), [])

    def test_the_own_badge_off_is_reported_with_nobody_to_ask(self):
        self.assertEqual(self.started(visible=False).lookup([]), [])

    def test_the_own_badge_off_still_asks_about_the_others(self):
        self.assertEqual(self.started(visible=False).lookup([2]), [2])

    def test_a_later_lookup_asks_only_the_new_players(self):
        badges = self.started()
        badges.lookup([2, 3])

        self.assertEqual(badges.lookup([2, 3, 4]), [4])

    def test_a_later_lookup_without_new_players_is_skipped(self):
        badges = self.started()
        badges.lookup([2])

        self.assertIsNone(badges.lookup([2]))

    def test_stops_after_the_lookup_limit(self):
        badges = self.started()
        for account_id in range(MAX_LOOKUPS):
            badges.lookup([account_id + 2])

        self.assertIsNone(badges.lookup([99]))

    def test_never_looks_up_without_the_own_account(self):
        badges = BattleBadges()
        badges.start(ARENA, None, True)

        self.assertIsNone(badges.lookup([2]))

    def test_adds_the_answer_of_this_battle(self):
        badges = self.started()

        changed = badges.answered(ARENA, frozenset([2]))

        self.assertTrue(changed)
        self.assertEqual(badges.marked, frozenset([OWN, 2]))

    def test_drops_an_answer_for_another_battle(self):
        badges = self.started()

        changed = badges.answered(ARENA + 1, frozenset([2]))

        self.assertFalse(changed)
        self.assertEqual(badges.marked, frozenset([OWN]))

    def test_a_later_lookup_with_the_own_badge_off_and_nobody_new_is_skipped(self):
        badges = self.started(visible=False)
        badges.lookup([])

        self.assertIsNone(badges.lookup([]))

    def test_forgets_everything_when_the_battle_ends(self):
        badges = self.started()
        badges.answered(ARENA, frozenset([2]))

        badges.stop()

        self.assertEqual(badges.marked, frozenset())


class BadgeSwitchTest(unittest.TestCase):

    def test_switching_off_is_reported(self):
        switch = BadgeSwitch(True)

        self.assertTrue(switch.switched_off(False))

    def test_switching_off_is_reported_once(self):
        switch = BadgeSwitch(True)
        switch.switched_off(False)

        self.assertFalse(switch.switched_off(False))

    def test_switching_on_is_not_reported(self):
        switch = BadgeSwitch(False)

        self.assertFalse(switch.switched_off(True))

    def test_staying_on_is_not_reported(self):
        switch = BadgeSwitch(True)

        self.assertFalse(switch.switched_off(True))


if __name__ == '__main__':
    unittest.main()
