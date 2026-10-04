# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.companion.config import (
    DEFAULT_SERVER_URL,
    DEFAULTS_REVISION,
    FEATURES,
    OPT_IN_FEATURES,
    RETIRED_DEFAULTS,
    Config,
    is_valid_server_url,
)
from otmetki.companion.i18n import STRINGS, Translator, resolve_language
from otmetki.companion.settings_ui import BIND_CODE_VAR, build_template, settings_to_config

RETIRED_VALUES = dict((key, old) for _, key, old, _ in RETIRED_DEFAULTS)
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

    def test_the_equipment_row_turned_off_after_the_one_time_switches_stays_off(self):
        upgraded = Config({'defaults_revision': 1})

        chosen = Config(dict(upgraded.to_dict(), battle_loadout=False))

        self.assertEqual(chosen.get('battle_loadout'), False)

    def test_the_switch_of_the_removed_consumables_bar_drops_out_of_the_file(self):
        config = Config({'defaults_revision': 2, 'battle_consumables': True, 'battle_loadout': True})

        self.assertNotIn('battle_consumables', config.to_dict())
        self.assertFalse(config.is_enabled('battle_consumables'))

    def test_a_fresh_config_is_stamped_with_the_current_revision(self):
        self.assertEqual(Config().get('defaults_revision'), DEFAULTS_REVISION)

    def test_master_switch(self):
        config = Config({'enabled': False})

        self.assertFalse(config.is_enabled('send_battle_results'))

    def test_endpoint_joins_the_server_url_and_the_path(self):
        config = Config({'server_url': 'http://127.0.0.1:4000/'})

        self.assertEqual(config.endpoint('/mod/ingest'), 'http://127.0.0.1:4000/mod/ingest')


class ServerUrlTest(unittest.TestCase):

    def test_accepts_https(self):
        self.assertTrue(is_valid_server_url('https://api.example'))

    def test_accepts_localhost_with_a_port(self):
        self.assertTrue(is_valid_server_url('http://localhost:4000'))

    def test_rejects_a_host_that_only_starts_like_localhost(self):
        self.assertFalse(is_valid_server_url('http://localhost.evil.com'))

    def test_rejects_other_schemes(self):
        self.assertFalse(is_valid_server_url('ftp://x'))


class SettingsTemplateTest(unittest.TestCase):

    def setUp(self):
        config = Config({'send_queue_times': False})
        self.template = build_template(config, Translator('en'), 'status')

    def test_template_names_the_mod(self):
        self.assertEqual(self.template['modDisplayName'], 'Three Marks')

    def test_first_column_has_a_checkbox_per_feature(self):
        names = [checkbox['varName'] for checkbox in self.template['column1']]

        self.assertEqual(names, list(FEATURES))

    def test_checkboxes_carry_the_config_values(self):
        by_name = dict((checkbox['varName'], checkbox) for checkbox in self.template['column1'])

        self.assertFalse(by_name['send_queue_times']['value'])

    def test_second_column_has_the_bind_code_input(self):
        bind_input = self.template['column2'][1]

        self.assertEqual(bind_input['type'], 'TextInput')
        self.assertEqual(bind_input['varName'], BIND_CODE_VAR)

    def test_settings_to_config_keeps_only_config_switches(self):
        updates = settings_to_config({'enabled': False, 'send_queue_times': False, BIND_CODE_VAR: 'ABCDEF', 'x': 1})

        self.assertEqual(updates, {'enabled': False, 'send_queue_times': False})


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
        text = Translator('ru')('bind_failed', reason='x')

        self.assertEqual(text, u'Три отметки: не удалось привязать (x)')

    def test_translator_falls_back_to_russian(self):
        self.assertEqual(Translator('de').language, 'ru')


if __name__ == '__main__':
    unittest.main()
