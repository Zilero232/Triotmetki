from __future__ import absolute_import, division, print_function, unicode_literals

import json
import unittest

import _support
from otmetki.companion.binding import Credentials
from otmetki.companion.config import Config
from otmetki.companion.settings_share import (
    POLL_PATH,
    RESULT_PATH,
    SettingsShareError,
    build_export,
    build_export_request,
    build_poll_request,
    build_result_request,
    changes_to_values,
    flatten_settings,
    parse_poll_response,
    plan_apply,
    result_path,
    signed_post,
)
from otmetki.core.net.signing import DEVICE_HEADER, verify_request

SECRET = 'q' * 43
CREDS = Credentials('dev_1', SECRET, 7, 1)
REQUEST_ID = '0b5e4f9e-4c1a-4d8e-9a3b-2f6c1d0e7a11'
POLL_URL = 'https://api.example' + POLL_PATH

MINE = {
    'resolution': '1920x1080',
    'refreshRate': 144,
    'windowMode': 'fullscreen',
    'graphicsPreset': 'high',
    'fov': 95,
    'arcadeSens': 0.5,
    'sniperSens': 0.3,
    'zoomSteps': ['x2', 'x4', 'x8'],
    'volumeMaster': 80,
}

CREATOR = {
    'display': {'resolution': '2560x1440', 'refreshRate': 240, 'windowMode': 'borderless', 'preset': 'low'},
    'camera': {'fov': 110},
    'controls': {'sensitivity': {'arcade': 0.8, 'sniper': 0.2}, 'invert': False},
    'zoom': {'steps': ['x2', 'x4', 'x8', 'x16', 'x25']},
    'sound': {'master': 50},
}

PERSONAL = {
    'login': 'player@mail.ru',
    'password': 'x',
    'token': 'abc',
    'loginPage': {'login': 'me'},
    'account_id': 7,
    'databaseID': 7,
    'gpu': 'RTX 4090',
    'cpu': 'i9',
    'mouseDpi': 1600,
    'modpack': 'Jove',
    'mods': ['xvm'],
    'hardware': {'gpu': 'x'},
}
OUT_OF_RANGE = {'fov': 200, 'sniperSens': 5.0, 'zoomSteps': ['x2', 'x100'], 'vsync': 'yes', 'resolution': 'big'}

POLL_DATA = {'requests': [
    {
        'id': REQUEST_ID,
        'profile_slug': 'nidin',
        'groups': ['camera', 'mods'],
        'settings': dict(CREATOR, hardware={'gpu': 'x'}, mods={'kind': 'modpack'}),
    },
    {'id': 'not-a-uuid', 'groups': ['camera'], 'settings': {}},
    {'id': REQUEST_ID, 'groups': ['hardware'], 'settings': {}},
    'junk',
]}

EXPORT_ERRORS = (
    ((CREDS, '0.4.0', 'public', False, MINE), 'bad_target'),
    ((CREDS, '0.4.0', 'profile', False, {'login': 'x'}), 'empty'),
    ((None, '0.4.0', 'profile', False, MINE), 'not_bound'),
    ((Credentials('dev', 'short', 7), '0.4.0', 'profile', False, MINE), 'not_bound'),
)


def validator(definition):
    return _support.schema_validator('settings.schema.json', definition)


def share_error_reason(call, *args):
    try:
        call(*args)
    except SettingsShareError as error:
        return error.reason
    return None


def apply_request(groups, settings=None):
    return {'id': REQUEST_ID, 'profile_slug': 'nidin', 'groups': groups, 'settings': settings or CREATOR}


def changed_fields(changes):
    return [(group, field) for group, field, _, _ in changes]


class ExportTest(unittest.TestCase):

    def setUp(self):
        raw = dict(
            MINE,
            dynamicFov=[80, 110],
            enemyMarkers=['hpBar', 'tier'],
            graphicsOverrides={'shadows': 'off', 'x': 'y'},
        )
        self.settings = build_export(raw)

    def test_display_group(self):
        self.assertEqual(self.settings['display'], {
            'resolution': '1920x1080',
            'refreshRate': 144,
            'windowMode': 'fullscreen',
            'preset': 'high',
            'overrides': {'shadows': 'off'},
        })

    def test_dotted_fields_become_nested_groups(self):
        self.assertEqual(self.settings['camera'], {'fov': 95, 'dynamicFov': [80, 110]})
        self.assertEqual(self.settings['controls'], {'sensitivity': {'arcade': 0.5, 'sniper': 0.3}})
        self.assertEqual(self.settings['markers'], {'enemy': {'base': ['hpBar', 'tier']}})

    def test_list_and_number_groups(self):
        self.assertEqual(self.settings['zoom'], {'steps': ['x2', 'x4', 'x8']})
        self.assertEqual(self.settings['sound'], {'master': 80})


class ExportWhitelistTest(unittest.TestCase):

    def setUp(self):
        raw = dict(MINE)
        raw.update(PERSONAL)
        raw.update(OUT_OF_RANGE)
        self.settings = build_export(raw)

    def test_personal_values_never_leave(self):
        text = json.dumps(self.settings)

        for leaked in ('player@mail.ru', 'login', 'token', 'password', 'RTX', 'i9', '1600', 'Jove', 'xvm'):
            self.assertNotIn(leaked, text)

    def test_unknown_groups_are_dropped(self):
        self.assertNotIn('hardware', self.settings)
        self.assertNotIn('mods', self.settings)

    def test_out_of_range_values_are_dropped(self):
        self.assertNotIn('fov', self.settings.get('camera', {}))
        self.assertEqual(self.settings['controls'], {'sensitivity': {'arcade': 0.5}})
        self.assertNotIn('zoom', self.settings)
        self.assertNotIn('resolution', self.settings['display'])


class FlattenTest(unittest.TestCase):

    def test_flatten_is_inverse(self):
        self.assertEqual(flatten_settings(build_export(MINE)), MINE)

    def test_flatten_drops_unknown_and_malformed_groups(self):
        flat = flatten_settings({'hardware': {'gpu': 'x'}, 'mods': {'kind': 'clean'}, 'camera': 'bad'})

        self.assertEqual(flat, {})


class PlanApplyTest(unittest.TestCase):

    def test_limited_to_requested_groups(self):
        changes = plan_apply(MINE, apply_request(['camera', 'zoom']))

        self.assertEqual(changes, [
            ('camera', 'fov', 95, 110),
            ('zoom', 'steps', ['x2', 'x4', 'x8'], ['x2', 'x4', 'x8', 'x16', 'x25']),
        ])

    def test_resolution_and_sensitivity_excluded_by_default(self):
        changes = plan_apply(MINE, apply_request(['display', 'controls']))

        self.assertEqual(changed_fields(changes), [('display', 'preset'), ('controls', 'invert')])

    def test_resolution_opt_in_leaves_sensitivity_out(self):
        changes = plan_apply(MINE, apply_request(['display', 'controls']), include_resolution=True)

        fields = changed_fields(changes)
        self.assertIn(('display', 'resolution'), fields)
        self.assertIn(('display', 'windowMode'), fields)
        self.assertNotIn(('controls', 'sensitivity.sniper'), fields)

    def test_sensitivity_opt_in(self):
        changes = plan_apply(MINE, apply_request(['controls']), include_sensitivity=True)

        self.assertIn(('controls', 'sensitivity.arcade', 0.5, 0.8), changes)
        self.assertIn(('controls', 'sensitivity.sniper', 0.3, 0.2), changes)

    def test_no_diff_for_equal_values(self):
        self.assertEqual(plan_apply(dict(MINE, fov=110), apply_request(['camera'])), [])

    def test_no_diff_for_unknown_groups(self):
        self.assertEqual(plan_apply(MINE, apply_request(['hardware', 'mods'])), [])

    def test_changes_to_values(self):
        changes = plan_apply(MINE, apply_request(['camera', 'sound']))

        self.assertEqual(changes_to_values(changes), {'fov': 110, 'volumeMaster': 50})


class ExportRequestTest(unittest.TestCase):

    def setUp(self):
        self.payload = build_export_request(CREDS, '0.4.0', 'private', True, MINE)

    def test_export_request_fields(self):
        payload = self.payload

        self.assertEqual(
            sorted(payload.keys()),
            ['account_id', 'anonymous_stats', 'device_id', 'mod_version', 'settings', 'target'],
        )
        self.assertEqual(payload['device_id'], 'dev_1')
        self.assertEqual(payload['account_id'], 7)
        self.assertTrue(payload['anonymous_stats'])
        self.assertEqual(payload['settings'], build_export(MINE))

    def test_export_request_matches_contract(self):
        check = validator('export')
        if check is None:
            self.skipTest('jsonschema is not installed')

        self.assertEqual(list(check.iter_errors(self.payload)), [])

    def test_export_errors(self):
        reasons = [(args, share_error_reason(build_export_request, *args)) for args, _ in EXPORT_ERRORS]

        self.assertEqual(reasons, list(EXPORT_ERRORS))


class PollAndResultTest(unittest.TestCase):

    def test_poll_request_is_the_device(self):
        self.assertEqual(build_poll_request(CREDS), {'device_id': 'dev_1', 'account_id': 7})

    def test_result_request_carries_the_status(self):
        request = build_result_request(CREDS, 'rejected')

        self.assertEqual(request, {'device_id': 'dev_1', 'account_id': 7, 'status': 'rejected'})

    def test_result_request_rejects_an_unknown_status(self):
        with self.assertRaises(SettingsShareError):
            build_result_request(CREDS, 'expired')

    def test_result_path_takes_the_request_id(self):
        self.assertEqual(result_path(REQUEST_ID), RESULT_PATH % REQUEST_ID)

    def test_result_path_rejects_anything_but_a_uuid(self):
        with self.assertRaises(SettingsShareError):
            result_path('../../admin')

    def test_requests_match_contract(self):
        if validator('result') is None:
            self.skipTest('jsonschema is not installed')
        payloads = (('deviceRequest', build_poll_request(CREDS)), ('result', build_result_request(CREDS, 'applied')))

        errors = [list(validator(name).iter_errors(payload)) for name, payload in payloads]

        self.assertEqual(errors, [[], []])


class ParsePollResponseTest(unittest.TestCase):

    def test_the_contract_accepts_a_clean_response(self):
        check = validator('pollResponse')
        if check is None:
            self.skipTest('jsonschema is not installed')
        clean = {'id': REQUEST_ID, 'profile_slug': 'nidin', 'groups': ['camera'], 'settings': CREATOR}

        self.assertEqual(list(check.iter_errors({'requests': [clean]})), [])

    def test_keeps_only_valid_requests_and_applicable_groups(self):
        requests = parse_poll_response(POLL_DATA)

        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]['groups'], ['camera'])

    def test_drops_unknown_settings_groups(self):
        settings = parse_poll_response(POLL_DATA)[0]['settings']

        self.assertNotIn('hardware', settings)
        self.assertNotIn('mods', settings)

    def test_malformed_requests_are_no_requests(self):
        self.assertEqual(parse_poll_response({'requests': 'x'}), [])

    def test_no_body_is_no_requests(self):
        self.assertEqual(parse_poll_response(None), [])


class SignedPostTest(unittest.TestCase):

    def setUp(self):
        self.transport = _support.FakeTransport()
        self.calls = []
        signed_post(self.transport, POLL_URL, CREDS, build_poll_request(CREDS), 'ua', self.record)

    def record(self, *args):
        self.calls.append(args)

    def test_signed_like_ingest(self):
        request = self.transport.requests[0]

        self.assertEqual(request['method'], 'POST')
        self.assertEqual(request['headers'][DEVICE_HEADER], 'dev_1')
        self.assertTrue(verify_request(SECRET, 'POST', POLL_URL, request['headers'], request['body']))

    def test_the_response_reaches_the_callback(self):
        self.transport.respond(204)

        self.assertEqual(self.calls, [(204, b'', {})])


class ConfigSwitchTest(unittest.TestCase):

    def test_defaults(self):
        config = Config()

        self.assertTrue(config.is_enabled('share_settings'))
        self.assertEqual(config.get('settings_target'), 'private')
        self.assertFalse(config.get('settings_anonymous_stats'))
        self.assertFalse(config.get('settings_include_resolution'))
        self.assertFalse(config.get('settings_include_sensitivity'))

    def test_unknown_choices_fall_back(self):
        config = Config()

        config.update({'share_settings': False, 'settings_target': 'everyone', 'settings_action': 'rm -rf'})

        self.assertFalse(config.is_enabled('share_settings'))
        self.assertEqual(config.get('settings_target'), 'private')
        self.assertEqual(config.get('settings_action'), '')

    def test_known_choices_are_taken(self):
        config = Config()

        config.update({'settings_target': 'profile', 'settings_action': 'export'})

        self.assertEqual(config.get('settings_target'), 'profile')
        self.assertEqual(config.get('settings_action'), 'export')

    def test_the_retired_restore_action_falls_back(self):
        config = Config()

        config.update({'settings_action': 'restore'})

        self.assertEqual(config.get('settings_action'), '')


if __name__ == '__main__':
    unittest.main()
