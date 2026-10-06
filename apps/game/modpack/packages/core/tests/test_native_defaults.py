from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.native_settings import (
    ACTION_RECOMMENDED,
    ACTION_RESTORE,
    NATIVE,
    TRI_STATE,
    NativeState,
    client_holds,
    client_keys,
    is_recommended,
    native_choices,
    offered_action,
    recommended,
)
from otmetki.core.settings import Schema

SCHEMA = Schema(
    {'preset': 'minimal', 'server_reticle': NATIVE, 'mark': 'none', 'size': 48},
    choices={
        'preset': (NATIVE, 'classic', 'minimal'),
        'server_reticle': TRI_STATE,
        'mark': ('none', 'dot'),
    },
)


class ClientKeysTest(unittest.TestCase):

    def test_client_keys_are_the_choices_that_offer_native(self):
        assert client_keys(SCHEMA) == ('preset', 'server_reticle')

    def test_recommended_values_are_the_schema_defaults(self):
        assert recommended(SCHEMA, ('preset', 'server_reticle')) == {'preset': 'minimal', 'server_reticle': NATIVE}

    def test_native_choices_leave_every_key_to_the_game(self):
        assert native_choices(('preset', 'server_reticle')) == {'preset': NATIVE, 'server_reticle': NATIVE}

    def test_the_defaults_are_recommended(self):
        values = {'preset': 'minimal', 'server_reticle': NATIVE, 'mark': 'dot'}

        assert is_recommended(values, SCHEMA, ('preset', 'server_reticle')) is True

    def test_a_native_preset_is_not_recommended(self):
        values = {'preset': NATIVE, 'server_reticle': NATIVE}

        assert is_recommended(values, SCHEMA, ('preset', 'server_reticle')) is False


class OfferedActionTest(unittest.TestCase):

    def test_a_backup_offers_the_restore(self):
        assert offered_action(True, True) == ACTION_RESTORE

    def test_values_off_the_recommendation_offer_it(self):
        assert offered_action(False, False) == ACTION_RECOMMENDED

    def test_recommended_values_without_a_backup_offer_nothing(self):
        assert offered_action(False, True) is None


class ClientHoldsTest(unittest.TestCase):

    def test_the_client_at_the_wanted_values_holds_them(self):
        assert client_holds({'a': 2, 'b': True}, {'a': 2, 'b': True}) is True

    def test_one_client_value_off_the_wanted_one_does_not_hold(self):
        assert client_holds({'a': 0, 'b': True}, {'a': 2, 'b': True}) is False

    def test_a_name_the_client_does_not_know_does_not_count(self):
        assert client_holds({'a': 2}, {'a': 2, 'unknown': 1}) is True

    def test_a_dict_setting_holds_when_the_wanted_parts_match(self):
        assert client_holds({'reticle': {'x': 1, 'y': 2}}, {'reticle': {'x': 1}}) is True

    def test_nothing_wanted_is_held(self):
        assert client_holds({'a': 0}, {}) is True


class BackupTest(unittest.TestCase):

    def test_a_kept_backup_reads_back(self):
        state = NativeState()

        state.keep('minimap', {'minimapViewRange': False}, {'minimapSize': 2})

        assert state.backup('minimap') == ({'minimapViewRange': False}, {'minimapSize': 2})

    def test_a_backup_is_stored_per_component(self):
        state = NativeState()

        state.keep('camera', {'dynamicCamera': True}, {})

        assert state.dump_backups() == {'camera': {'settings': {'dynamicCamera': True}, 'account': {}}}

    def test_a_dropped_backup_is_gone(self):
        state = NativeState(backups={'camera': {'settings': {'dynamicCamera': True}, 'account': {}}})

        state.drop('camera')

        assert state.backup('camera') is None

    def test_a_damaged_backup_reads_as_none(self):
        assert NativeState(backups={'camera': 'x'}).backup('camera') is None

    def test_damaged_state_starts_empty(self):
        state = NativeState(backups=[1])

        assert state.dump_backups() == {}
