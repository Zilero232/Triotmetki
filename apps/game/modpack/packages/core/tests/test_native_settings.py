from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import struct
import unittest

import _support  # noqa: F401
from otmetki.core.native_settings import NATIVE, from_table, native_values, tri_state, write_settings
from otmetki.core.replay_file import MAGIC, is_replay_name, read_header_from


def client_fields():
    return {
        'a': ('clientA', tri_state),
        'b': ('clientB', from_table({'x': 1})),
        'c': ('clientC', tri_state),
    }


def arena_block():
    return {
        'playerID': 5,
        'mapName': 'm',
        'mapDisplayName': 'Map',
        'playerVehicle': 'ussr-R04_T-34',
        'dateTime': '01.02.2026 03:04:05',
    }


def replay_header(blocks, count=None):
    block_count = len(blocks) if count is None else count
    data = struct.pack(str('<II'), MAGIC, block_count)
    for block in blocks:
        raw = json.dumps(block).encode('utf-8')
        data += struct.pack(str('<I'), len(raw)) + raw
    return read_header_from(io.BytesIO(data))


class RecordingCore(object):

    def __init__(self):
        self.calls = []

    def applySettings(self, diff):
        self.calls.append(('applySettings', diff))

    def applyStorages(self, restartApproved, force=False):
        self.calls.append(('applyStorages', restartApproved))
        return ['confirmator']

    def confirmChanges(self, confirmators):
        self.calls.append(('confirmChanges', confirmators))

    def clearStorages(self):
        self.calls.append(('clearStorages',))


class NativeSettingsTest(unittest.TestCase):

    def test_on_is_true(self):
        assert tri_state('on') is True

    def test_off_is_false(self):
        assert tri_state('off') is False

    def test_native_leaves_the_client_value(self):
        assert tri_state(NATIVE) is None

    def test_an_unknown_value_leaves_the_client_value(self):
        assert tri_state('bogus') is None

    def test_native_values_skip_native_and_unknown_keys(self):
        values = native_values({'a': 'off', 'b': 'x', 'z': 'on'}, client_fields())

        assert values == {'clientA': False, 'clientB': 1}

    def test_all_native_values_change_nothing(self):
        values = native_values({'a': NATIVE, 'b': NATIVE}, client_fields())

        assert values == {}


class WriteSettingsTest(unittest.TestCase):

    def test_order_of_the_game_settings_window(self):
        core = RecordingCore()

        write_settings(core, {'minimapAlpha': 40})

        assert core.calls == [
            ('applySettings', {'minimapAlpha': 40}),
            ('applyStorages', False),
            ('confirmChanges', ['confirmator']),
            ('clearStorages',),
        ]

    def test_no_confirmators_confirms_an_empty_list(self):
        core = RecordingCore()
        core.applyStorages = lambda restartApproved, force=False: None

        write_settings(core, {'a': 1})

        assert ('confirmChanges', []) in core.calls


class ReplayHeaderTest(unittest.TestCase):

    def test_arena_and_results_blocks(self):
        header = replay_header([arena_block(), [{'arenaUniqueID': 42}]])

        assert header['player_id'] == 5
        assert header['arena_unique_id'] == '42'
        assert header['map_name'] == 'm'
        assert header['map_title'] == 'Map'
        assert header['vehicle'] == 'ussr-R04_T-34'
        assert header['date_time'] is not None

    def test_a_file_without_the_magic_is_not_a_replay(self):
        assert read_header_from(io.BytesIO(b'\x00' * 16)) is None

    def test_a_replay_without_blocks_has_no_header(self):
        assert replay_header([], count=0) is None

    def test_a_block_that_is_not_the_arena_dict_has_no_header(self):
        assert replay_header(['text']) is None


class ReplayNameTest(unittest.TestCase):

    def test_replay_extensions_in_any_case(self):
        assert is_replay_name('a.MTREPLAY')
        assert is_replay_name('b.wotreplay')

    def test_other_extensions_are_not_replays(self):
        assert not is_replay_name('a.txt')

    def test_the_recording_temp_file_is_not_a_replay(self):
        assert not is_replay_name('temp.mtreplay')

    def test_numbered_temp_files_are_not_replays(self):
        assert not is_replay_name('temp1.mtreplay')
        assert not is_replay_name('TEMP99.wotreplay')

    def test_names_past_the_temp_range_are_replays(self):
        assert is_replay_name('temp100.mtreplay')
        assert is_replay_name('temple.mtreplay')


if __name__ == '__main__':
    unittest.main()
