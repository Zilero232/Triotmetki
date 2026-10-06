from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.companion.badge import (
    RETRY_S,
    PreferenceSync,
    preference_body,
    restore_synced,
    wanted_visible,
)
from otmetki.companion.binding import Credentials
from otmetki.companion.config import DEFAULTS
from otmetki.core.errors import ReasonError

CREDENTIALS = Credentials('dev_badge', 'q' * 43, 12345678)
NOW = 1000.0


class WantedVisibleTest(unittest.TestCase):

    def test_the_default_config_shows_the_badge(self):
        self.assertTrue(wanted_visible(DEFAULTS))

    def test_the_switch_off_hides_it(self):
        config = dict(DEFAULTS, show_pack_badge=False)

        self.assertFalse(wanted_visible(config))

    def test_the_whole_mod_off_hides_it(self):
        config = dict(DEFAULTS, enabled=False)

        self.assertFalse(wanted_visible(config))


class PreferenceBodyTest(unittest.TestCase):

    def test_carries_the_device_and_the_switch_only(self):
        body = preference_body(CREDENTIALS, False)

        self.assertEqual(body, {'device_id': 'dev_badge', 'account_id': 12345678, 'visible': False})

    def test_matches_the_contract(self):
        validator = _support.schema_validator('badges.schema.json', 'preference')
        if validator is None:
            self.skipTest('jsonschema is not installed')

        body = preference_body(CREDENTIALS, True)

        self.assertEqual(list(validator.iter_errors(body)), [])

    def test_refuses_without_a_binding(self):
        with self.assertRaises(ReasonError):
            preference_body(None, True)


class RestoreSyncedTest(unittest.TestCase):

    def test_keeps_a_stored_boolean(self):
        self.assertFalse(restore_synced(False))

    def test_drops_anything_else(self):
        self.assertIsNone(restore_synced('yes'))


class PreferenceSyncTest(unittest.TestCase):

    def test_reports_a_shown_badge_that_was_never_reported(self):
        sync = PreferenceSync()

        self.assertTrue(sync.needs_sync(True, NOW))

    def test_does_not_report_a_never_reported_hidden_badge(self):
        sync = PreferenceSync()

        self.assertFalse(sync.needs_sync(False, NOW))

    def test_reports_hiding_after_the_site_stored_shown(self):
        sync = PreferenceSync()
        sync.reset(True)

        self.assertTrue(sync.needs_sync(False, NOW))

    def test_a_stored_value_is_not_sent_again(self):
        sync = PreferenceSync()
        sync.sent()
        sync.answered(True, 200, NOW)

        self.assertFalse(sync.needs_sync(True, NOW))

    def test_waits_while_a_report_is_on_the_way(self):
        sync = PreferenceSync()
        sync.sent()

        self.assertFalse(sync.needs_sync(True, NOW))

    def test_a_failed_report_is_retried_after_the_delay(self):
        sync = PreferenceSync()
        sync.sent()
        sync.answered(True, 503, NOW)

        self.assertFalse(sync.needs_sync(True, NOW + RETRY_S - 1))
        self.assertTrue(sync.needs_sync(True, NOW + RETRY_S))

    def test_a_change_of_the_switch_skips_the_retry_delay(self):
        sync = PreferenceSync()
        sync.sent()
        sync.answered(True, 503, NOW)

        sync.changed()

        self.assertTrue(sync.needs_sync(True, NOW))

    def test_a_refused_value_is_not_sent_again(self):
        sync = PreferenceSync()
        sync.sent()
        sync.answered(True, 400, NOW)

        self.assertFalse(sync.needs_sync(True, NOW + RETRY_S))


if __name__ == '__main__':
    unittest.main()
