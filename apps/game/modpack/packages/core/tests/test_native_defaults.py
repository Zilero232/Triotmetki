from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.native_settings import (
    ACTION_RECOMMENDED,
    ACTION_RESTORE,
    NATIVE,
    ONCE_DONE,
    ONCE_NATIVE,
    ONCE_WAIT,
    ONCE_WRITE,
    TRI_STATE,
    NativeState,
    client_holds,
    client_keys,
    is_recommended,
    native_choices,
    offered_action,
    once_step,
    recommended,
)
from otmetki.core.settings import Schema

ONCE = {'key': 'names', 'value': 'always', 'off': 0}
ALWAYS = 2
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


class OnceStepTest(unittest.TestCase):

    def test_a_game_at_the_off_value_is_written(self):
        assert once_step(ONCE, 'always', False, 0, ALWAYS) == ONCE_WRITE

    def test_a_value_the_player_chose_is_left(self):
        assert once_step(ONCE, 'always', True, 0, ALWAYS) == ONCE_DONE

    def test_a_section_off_the_once_value_is_left(self):
        assert once_step(ONCE, NATIVE, False, 0, ALWAYS) == ONCE_DONE

    def test_an_unreadable_client_waits(self):
        assert once_step(ONCE, 'always', False, None, ALWAYS) == ONCE_WAIT

    def test_a_game_already_at_the_value_is_done(self):
        assert once_step(ONCE, 'always', False, ALWAYS, ALWAYS) == ONCE_DONE

    def test_a_game_at_another_value_puts_the_section_back_to_native(self):
        assert once_step(ONCE, 'always', False, 1, ALWAYS) == ONCE_NATIVE

    def test_the_once_key_starts_at_its_value(self):
        assert native_choices(('names', 'size'), ONCE) == {'names': 'always', 'size': NATIVE}


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

    def test_a_marked_once_reads_back(self):
        state = NativeState()

        state.mark_once('minimap')

        assert state.once_done('minimap') is True

    def test_a_once_is_stored_once(self):
        state = NativeState(once=['minimap'])

        state.mark_once('minimap')

        assert state.dump_once() == ['minimap']

    def test_a_damaged_once_starts_empty(self):
        assert NativeState(once={'minimap': 1}).dump_once() == []

    def test_damaged_state_starts_empty(self):
        state = NativeState(backups=[1])

        assert state.dump_backups() == {}
