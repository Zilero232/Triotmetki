# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import shutil
import tempfile
import unittest

import _support  # noqa: F401
from otmetki.companion.config import (
    DEFAULT_SERVER_URL,
    DEFAULTS_REVISION,
    FEATURES,
    OPT_IN_FEATURES,
    RETIRED_DEFAULTS,
    Config,
    is_dev_install,
    is_valid_server_url,
    record_user_set,
)
from otmetki.companion.i18n import STRINGS, Translator, resolve_language

RETIRED_VALUES = {key: old for _, key, old, _ in RETIRED_DEFAULTS}
INVALID_UPDATE = {
    'enabled': 'yes',
    'send_queue_times': False,
    'flush_interval_seconds': 1,
    'session_idle_minutes': 30.7,
    'server_url': 'http://evil.example',
    'unknown': 1,
}


def config_at_retired_defaults():
    return Config(dict(RETIRED_VALUES, send_queue_times=False))


class ConfigTest(unittest.TestCase):

    def test_defaults_to_the_production_server(self):
        self.assertEqual(Config().server_url, DEFAULT_SERVER_URL)

    def test_every_feature_is_on_by_default_unless_opt_in(self):
        config = Config()

        disabled = [feature for feature in FEATURES if not config.is_enabled(feature)]

        self.assertEqual(disabled, [feature for feature in FEATURES if feature in OPT_IN_FEATURES])

    def test_update_reports_the_changed_keys(self):
        config = Config()

        changed = config.update(INVALID_UPDATE)

        self.assertEqual(changed, ['send_queue_times', 'session_idle_minutes'])

    def test_the_send_interval_is_fixed(self):
        config = Config({'flush_interval_seconds': 30})

        self.assertNotIn('flush_interval_seconds', config.to_dict())
        self.assertEqual(config.get('flush_interval_seconds'), 15)

    def test_update_validates_types_and_limits(self):
        config = Config()

        config.update(INVALID_UPDATE)

        self.assertTrue(config.get('enabled'))
        self.assertEqual(config.get('flush_interval_seconds'), 15)
        self.assertEqual(config.get('session_idle_minutes'), 30)
        self.assertEqual(config.server_url, DEFAULT_SERVER_URL)
        self.assertFalse(config.is_enabled('send_queue_times'))

    def test_a_switch_left_at_a_retired_default_takes_the_new_one(self):
        upgraded = config_at_retired_defaults()

        self.assertEqual(upgraded.get('battle_loadout'), True)

    def test_the_pack_badge_comes_back_on_once(self):
        upgraded = config_at_retired_defaults()

        self.assertTrue(upgraded.get('battle_pack_badge'))

    def test_upgrading_keeps_the_other_switches(self):
        upgraded = config_at_retired_defaults()

        self.assertFalse(upgraded.get('send_queue_times'))

    def test_upgrading_stamps_the_current_revision(self):
        upgraded = config_at_retired_defaults()

        self.assertEqual(upgraded.get('defaults_revision'), DEFAULTS_REVISION)

    def test_a_switch_chosen_after_the_upgrade_is_kept(self):
        upgraded = config_at_retired_defaults()

        chosen = Config(dict(upgraded.to_dict(), **RETIRED_VALUES))

        self.assertEqual(chosen.get('battle_loadout'), False)

    def test_a_config_stamped_before_the_one_time_switches_turns_the_equipment_row_on(self):
        upgraded = Config({'defaults_revision': 1, 'battle_loadout': False})

        self.assertEqual(upgraded.get('battle_loadout'), True)

    def test_a_pack_badge_the_0_3_8_update_switched_off_is_turned_on_once(self):
        upgraded = Config({'defaults_revision': 9, 'battle_pack_badge': False, 'user_set': 'battle_pack_badge'})

        self.assertTrue(upgraded.get('battle_pack_badge'))

    def test_the_pack_badge_turned_off_after_the_upgrade_stays_off(self):
        upgraded = Config({'defaults_revision': 9})

        chosen = Config(dict(upgraded.to_dict(), battle_pack_badge=False))

        self.assertFalse(chosen.get('battle_pack_badge'))

    def test_the_equipment_row_turned_off_after_the_one_time_switches_stays_off(self):
        upgraded = Config({'defaults_revision': 1})

        chosen = Config(dict(upgraded.to_dict(), battle_loadout=False))

        self.assertEqual(chosen.get('battle_loadout'), False)

    def test_the_switch_of_the_removed_consumables_bar_drops_out_of_the_file(self):
        config = Config({'defaults_revision': 2, 'battle_consumables': True, 'battle_loadout': True})

        self.assertNotIn('battle_consumables', config.to_dict())
        self.assertFalse(config.is_enabled('battle_consumables'))

    def test_the_switch_of_the_removed_settings_backup_drops_out_of_the_file(self):
        config = Config({'defaults_revision': 3, 'config_backup': True})

        self.assertNotIn('config_backup', config.to_dict())

    def test_the_retired_hud_window_switch_drops_out_of_the_file(self):
        config = Config({'defaults_revision': 8, 'hud_inject': False})

        self.assertNotIn('hud_inject', config.to_dict())

    def test_a_fresh_config_is_stamped_with_the_current_revision(self):
        self.assertEqual(Config().get('defaults_revision'), DEFAULTS_REVISION)

    def test_master_switch(self):
        config = Config({'enabled': False})

        self.assertFalse(config.is_enabled('send_battle_results'))

    def test_endpoint_joins_the_server_url_and_the_path(self):
        config = Config({'server_url': 'http://127.0.0.1:4000/'}, allow_custom_server=True)

        self.assertEqual(config.endpoint('/mod/ingest'), 'http://127.0.0.1:4000/mod/ingest')


class ServerUrlTest(unittest.TestCase):

    def test_accepts_https(self):
        self.assertTrue(is_valid_server_url('https://api.example'))

    def test_accepts_localhost_with_a_port(self):
        self.assertTrue(is_valid_server_url('http://localhost:4000'))
        self.assertTrue(is_valid_server_url('http://127.0.0.1:4000/'))

    def test_rejects_a_host_that_only_starts_like_localhost(self):
        self.assertFalse(is_valid_server_url('http://localhost.evil.com'))
        self.assertFalse(is_valid_server_url('http://127.0.0.1.evil.com'))

    def test_rejects_plain_http_elsewhere(self):
        self.assertFalse(is_valid_server_url('http://api.triotmetki.ru'))

    def test_rejects_user_info(self):
        self.assertFalse(is_valid_server_url('https://user:secret@api.example'))
        self.assertFalse(is_valid_server_url('https://api.triotmetki.ru@evil.example'))
        self.assertFalse(is_valid_server_url('http://localhost@evil.example'))

    def test_rejects_a_query_a_fragment_or_a_bad_port(self):
        self.assertFalse(is_valid_server_url('https://api.example/?x=1'))
        self.assertFalse(is_valid_server_url('https://api.example/#x'))
        self.assertFalse(is_valid_server_url('https://api.example:http'))

    def test_rejects_other_schemes(self):
        self.assertFalse(is_valid_server_url('ftp://x'))
        self.assertFalse(is_valid_server_url('https://'))


class PinnedServerTest(unittest.TestCase):

    def test_a_release_install_always_uses_the_production_api(self):
        config = Config({'server_url': 'https://evil.example'})

        self.assertEqual(config.server_url, DEFAULT_SERVER_URL)
        self.assertEqual(config.endpoint('/mod/bind'), DEFAULT_SERVER_URL + '/mod/bind')
        self.assertIsNone(config.custom_server())

    def test_a_dev_install_uses_its_server_and_names_it(self):
        config = Config({'server_url': 'http://localhost:4000'}, allow_custom_server=True)

        self.assertEqual(config.server_url, 'http://localhost:4000')
        self.assertEqual(config.custom_server(), 'http://localhost:4000')

    def test_a_dev_install_on_the_production_api_has_no_warning(self):
        self.assertIsNone(Config(allow_custom_server=True).custom_server())

    def test_an_invalid_server_never_becomes_the_dev_server(self):
        config = Config({'server_url': 'https://user:x@evil.example'}, allow_custom_server=True)

        self.assertEqual(config.server_url, DEFAULT_SERVER_URL)


class DevInstallTest(unittest.TestCase):

    def setUp(self):
        self.mods = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.mods, ignore_errors=True)

    def test_a_plain_install_is_no_dev_install(self):
        os.makedirs(os.path.join(self.mods, '1.45.0.0'))

        self.assertFalse(is_dev_install(environ={}, mods_dir=self.mods))

    def test_the_dev_loop_manifest_marks_a_dev_install(self):
        folder = os.path.join(self.mods, '1.45.0.0', 'otmetki-dev')
        os.makedirs(folder)
        with open(os.path.join(folder, 'otmetki-dev.json'), 'w') as handle:
            handle.write('{}')

        self.assertTrue(is_dev_install(environ={}, mods_dir=self.mods))

    def test_the_environment_flag_marks_a_dev_install(self):
        self.assertTrue(is_dev_install(environ={'OTMETKI_DEV': '1'}, mods_dir=self.mods))
        self.assertFalse(is_dev_install(environ={'OTMETKI_DEV': 'yes'}, mods_dir=self.mods))

    def test_a_missing_mods_folder_is_no_dev_install(self):
        self.assertFalse(is_dev_install(environ={}, mods_dir=os.path.join(self.mods, 'missing')))


class RecordUserSetTest(unittest.TestCase):

    def test_recorded_keys_join_the_user_set(self):
        config = Config({})

        record_user_set(config, ['hangar_tweaks', 'minimap.size'])

        assert config.get('user_set') == 'hangar_tweaks minimap.size'

    def test_a_key_already_recorded_changes_nothing(self):
        config = Config({'user_set': 'hangar_tweaks'})

        changed = record_user_set(config, ['hangar_tweaks'])

        assert changed is False

    def test_a_new_key_reports_the_change(self):
        assert record_user_set(Config({}), ['hangar_tweaks']) is True


class I18nTest(unittest.TestCase):

    def test_same_keys(self):
        self.assertEqual(sorted(STRINGS['ru'].keys()), sorted(STRINGS['en'].keys()))

    def test_an_explicit_language_wins(self):
        self.assertEqual(resolve_language('en'), 'en')

    def test_auto_follows_the_client_language(self):
        self.assertEqual(resolve_language('auto', 'ru'), 'ru')

    def test_auto_ignores_the_client_language_case(self):
        self.assertEqual(resolve_language('auto', 'EN'), 'en')

    def test_auto_falls_back_to_russian(self):
        self.assertEqual(resolve_language('auto', 'de'), 'ru')

    def test_translator_formats_arguments(self):
        text = Translator('ru')('settings_apply_title', slug='x')

        self.assertEqual(text, u'Настройки x')

    def test_translator_falls_back_to_russian(self):
        self.assertEqual(Translator('de').language, 'ru')


if __name__ == '__main__':
    unittest.main()
