# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import struct
import unittest

import _support
from otmetki.core.replay_file import MAGIC, MAX_HEADER_BLOCK_BYTES, own_outcome, own_stats, read_header_from

RESULTS_FIXTURE = 'battle_results_random.json'
ENEMY = {'name': 'enemy', 'team': 2, 'vehicleType': 'germany:G04_PzVI_Tiger_I'}
ARENA = {
    'playerID': 36306577,
    'playerName': 'Zilero',
    'dateTime': '28.09.2026 00:13:29',
    'mapName': '127_japort',
    'mapDisplayName': u'Старая гавань',
    'playerVehicle': 'ussr-R45_IS-7',
    'battleType': 1,
    'gameplayID': 'ctf',
    'clientVersionFromExe': '1.45.0.0',
    'clientVersionFromXml': u'«Мир танков» v.1.45.0.0 #2284',
    'serverName': 'RU1',
    'arenaUniqueID': 214987871146837746,
    'vehicles': {'9': ENEMY},
}
NO_OWN_ENTRY = {'personal': {'avatar': {'team': 1}}}
NESTING_DEPTH = 100000


def replay(*blocks):
    return raw_replay(*[json.dumps(block).encode('utf-8') for block in blocks])


def raw_replay(*raw_blocks):
    data = struct.pack(str('<II'), MAGIC, len(raw_blocks))
    for raw in raw_blocks:
        data += struct.pack(str('<I'), len(raw)) + raw
    return io.BytesIO(data + b'\x00' * 16)


def deeply_nested():
    return b'[' * NESTING_DEPTH + b']' * NESTING_DEPTH


def declared_size_only(size):
    return io.BytesIO(struct.pack(str('<III'), MAGIC, 1, size))


def battle_results():
    return _support.fixture(RESULTS_FIXTURE)


def results_block():
    return [battle_results(), {}, {}]


def arena_without_id():
    return dict(ARENA, arenaUniqueID=None)


def results_with_a_loud_enemy():
    data = battle_results()
    data['vehicles'] = {'9': [{'damageDealt': 99999, 'kills': 15, 'team': 2}]}
    data['players'] = {'1': {'name': 'someone'}}
    return data


def results_with_mistyped_own_values():
    data = battle_results()
    data['personal']['1'].update({'kills': '2', 'xp': True, 'deathReason': None})
    return data


def results_with_winner(team):
    data = battle_results()
    data['common']['winnerTeam'] = team
    return data


class ArenaHeaderTest(unittest.TestCase):

    def setUp(self):
        self.header = read_header_from(replay(ARENA))

    def test_the_recorder_is_read(self):
        assert self.header['player_id'] == 36306577
        assert self.header['player_name'] == 'Zilero'

    def test_the_arena_id_is_read_as_a_string(self):
        assert self.header['arena_unique_id'] == '214987871146837746'

    def test_the_map_and_vehicle_are_read(self):
        assert self.header['map_name'] == '127_japort'
        assert self.header['map_title'] == u'Старая гавань'
        assert self.header['vehicle'] == 'ussr-R45_IS-7'

    def test_the_battle_kind_and_client_are_read(self):
        assert self.header['battle_type'] == 1
        assert self.header['gameplay'] == 'ctf'
        assert self.header['client_version'] == '1.45.0.0'
        assert self.header['server'] == 'RU1'

    def test_the_date_is_read(self):
        assert self.header['date_time'] is not None

    def test_a_battle_left_early_has_no_outcome(self):
        assert self.header['result'] is None
        assert self.header['damage'] is None
        assert self.header['stats'] is None


class ResultsHeaderTest(unittest.TestCase):

    def setUp(self):
        self.header = read_header_from(replay(arena_without_id(), results_block()))

    def test_the_arena_id_comes_from_the_results_when_the_arena_block_lacks_it(self):
        assert self.header['arena_unique_id'] == '1152921504606847123'

    def test_the_own_outcome_and_damage_are_read(self):
        assert self.header['result'] == 'win'
        assert self.header['damage'] == 2150

    def test_the_own_assist_kills_and_xp_are_read(self):
        stats = self.header['stats']

        assert stats['assist'] == 950
        assert stats['assist_radio'] == 640
        assert stats['assist_track'] == 310
        assert stats['kills'] == 2
        assert stats['xp'] == 1150

    def test_the_battle_facts_are_read(self):
        stats = self.header['stats']

        assert stats['duration'] == 402
        assert stats['bonus_type'] == 1
        assert stats['survived'] is True
        assert stats['tank_id'] == 1

    def test_mastery_is_left_out(self):
        assert 'mastery' not in self.header['stats']


class OwnResultsTest(unittest.TestCase):

    def test_only_the_recorders_own_entry_is_read(self):
        stats = own_stats(results_with_a_loud_enemy())

        assert stats['kills'] == 2
        assert 99999 not in stats.values()

    def test_results_without_an_own_entry_have_no_outcome(self):
        assert own_outcome(NO_OWN_ENTRY) == (None, None)

    def test_results_without_an_own_entry_have_no_stats(self):
        assert own_stats(NO_OWN_ENTRY) is None

    def test_values_of_the_wrong_type_are_left_out(self):
        stats = own_stats(results_with_mistyped_own_values())

        assert 'kills' not in stats
        assert 'xp' not in stats
        assert stats['survived'] is None

    def test_no_winner_is_a_draw(self):
        result, _ = own_outcome(results_with_winner(0))

        assert result == 'draw'

    def test_the_other_team_winning_is_a_loss(self):
        result, _ = own_outcome(results_with_winner(2))

        assert result == 'loss'


class NotAReplayTest(unittest.TestCase):

    def test_a_file_without_the_magic_is_not_a_replay(self):
        assert read_header_from(io.BytesIO(b'\x00' * 16)) is None

    def test_a_replay_whose_first_block_is_not_an_object_is_not_read(self):
        assert read_header_from(replay('text')) is None

    def test_a_deeply_nested_arena_block_is_not_read(self):
        assert read_header_from(raw_replay(deeply_nested())) is None

    def test_a_deeply_nested_results_block_leaves_the_arena_header_without_results(self):
        header = read_header_from(raw_replay(json.dumps(ARENA).encode('utf-8'), deeply_nested()))

        assert header['stats'] is None

    def test_an_arena_block_over_its_cap_is_refused(self):
        assert read_header_from(declared_size_only(MAX_HEADER_BLOCK_BYTES[0] + 1)) is None

    def test_a_results_block_over_its_cap_is_refused(self):
        arena = json.dumps(ARENA).encode('utf-8')
        head = struct.pack(str('<II'), MAGIC, 2) + struct.pack(str('<I'), len(arena)) + arena
        handle = io.BytesIO(head + struct.pack(str('<I'), MAX_HEADER_BLOCK_BYTES[1] + 1))

        assert read_header_from(handle) is None

    def test_an_arena_id_of_the_wrong_type_is_left_out(self):
        header = read_header_from(replay(dict(ARENA, arenaUniqueID=True)))

        assert header['arena_unique_id'] is None


if __name__ == '__main__':
    unittest.main()
