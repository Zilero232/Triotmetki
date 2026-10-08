# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import time
import unittest

import _support
from otmetki.companion.binding import Credentials
from otmetki.core.client.me import SignedRead, post_json, signed_body, signed_read
from otmetki.core.codec import encode_json
from otmetki.core.errors import ReasonError
from otmetki.core.me import (
    MAX_TANKS,
    TANKS_PATH,
    ReadState,
    device_body,
    expected,
    is_auth_failure,
    owned,
    records,
    retry_delay,
    tank_ids,
    tank_key,
    tank_rows,
    tanks_request,
)
from _support import verify_request

ACCOUNT = 12345678
CREDENTIALS = Credentials('dev_me', 's' * 40, ACCOUNT)
T0 = 1790000000.0
API = 'https://api.example'


def tanks_example():
    data = _support.load_json(os.path.join(_support.CONTRACT_DIR, 'examples', 'ratings-tanks.example.json'))
    data['account_id'] = ACCOUNT
    return data


def malformed_tank():
    return {
        'tank_id': 9,
        'battles': -3,
        'win_rate': 140,
        'marks_on_gun': 5,
        'mastery': 7,
        'wn8': {'value': 'a', 'tier': 'god'},
    }


def tanks_with_malformed_rows():
    data = tanks_example()
    data['tanks'].append({'tank_id': 'x'})
    data['tanks'].append(malformed_tank())
    return data


def pending_read():
    reads = ReadState()
    reads.start(['k'])
    return reads


def finished_read():
    reads = pending_read()
    reads.done(['k'])
    return reads


def failed_read():
    reads = pending_read()
    reads.fail(['k'], T0, 60)
    return reads


class RequestsTest(unittest.TestCase):

    def test_device_body_names_the_bound_device(self):
        assert device_body(CREDENTIALS) == {'device_id': 'dev_me', 'account_id': ACCOUNT}

    def test_device_body_needs_a_bound_device(self):
        unbound = Credentials('dev_me', 'short', ACCOUNT)

        with self.assertRaises(ReasonError) as caught:
            device_body(unbound)

        assert caught.exception.reason == 'not_bound'

    def test_device_body_without_a_binding_is_refused_as_not_bound(self):
        with self.assertRaises(ReasonError) as caught:
            device_body(None)

        assert caught.exception.reason == 'not_bound'

    def test_tanks_request_needs_a_valid_tank(self):
        with self.assertRaises(ReasonError) as caught:
            tanks_request(CREDENTIALS, [0, 'x'])

        assert caught.exception.reason == 'no_tanks'

    def test_tanks_request_without_a_device_is_refused(self):
        unbound = Credentials('', 's' * 40, ACCOUNT)

        with self.assertRaises(ReasonError):
            tanks_request(unbound, [1])

    def test_tanks_request_keeps_valid_unique_ids_up_to_the_limit(self):
        ids = [5, 5, 0, -1, True, 'x', 7] + list(range(100, 100 + MAX_TANKS))

        body = tanks_request(CREDENTIALS, ids)

        assert body['tank_ids'][:2] == [5, 7]
        assert len(body['tank_ids']) == MAX_TANKS
        assert body['device_id'] == 'dev_me'
        assert body['account_id'] == ACCOUNT

    def test_requests_match_the_contract(self):
        overview = _support.schema_validator('ratings.schema.json', 'overviewRequest')
        tanks = _support.schema_validator('ratings.schema.json', 'tanksRequest')
        if overview is None:
            self.skipTest('jsonschema not installed')

        overview.validate(device_body(CREDENTIALS))
        tanks.validate(tanks_request(CREDENTIALS, list(range(1, MAX_TANKS + 5))))

    def test_tank_ids_are_unique_and_valid(self):
        assert tank_ids([3, 3, -1, True, 7]) == [3, 7]

    def test_tanks_request_is_capped(self):
        request = tanks_request(CREDENTIALS, range(1, 120))

        assert len(request['tank_ids']) == 100

    def test_tank_key(self):
        assert tank_key(5) == 'tank:5'


class StatusTest(unittest.TestCase):

    def test_unauthorized_is_an_auth_failure(self):
        assert is_auth_failure(401)

    def test_forbidden_is_an_auth_failure(self):
        assert is_auth_failure(403)

    def test_rate_limit_is_not_an_auth_failure(self):
        assert not is_auth_failure(429)

    def test_rate_limit_waits_the_retry_after(self):
        assert retry_delay(429, 30) == 30.0

    def test_rate_limit_wait_is_capped(self):
        assert retry_delay(429, 10 ** 7) == 1800.0

    def test_rate_limit_without_retry_after_waits_a_minute(self):
        assert retry_delay(429) == 60.0

    def test_server_error_waits_two_minutes(self):
        assert retry_delay(500, 30) == 120.0

    def test_unavailable_server_waits_two_minutes(self):
        assert retry_delay(503, 30) == 120.0

    def test_no_answer_waits_two_minutes(self):
        assert retry_delay(0) == 120.0


class ParseTest(unittest.TestCase):

    def test_rows_with_records_and_expected_values(self):
        rows = tank_rows(tanks_example(), ACCOUNT)

        assert rows[1]['records'] == {'damage': 6812, 'assist': 5120, 'frags': 6, 'xp': 2740}
        assert rows[1]['expected']['win_rate'] == 52.3

    def test_a_tank_without_records_or_expected_values(self):
        rows = tank_rows(tanks_example(), ACCOUNT)

        assert rows[2849]['records'] is None
        assert rows[2849]['expected'] is None

    def test_another_account_is_dropped(self):
        assert tank_rows(tanks_example(), ACCOUNT + 1) == {}

    def test_the_tanks_example_matches_the_contract(self):
        validator = _support.schema_validator('ratings.schema.json', 'tanks')
        if validator is None:
            self.skipTest('jsonschema not installed')

        validator.validate(tanks_example())

    def test_rows_keep_valid_ids_only(self):
        rows = tank_rows(tanks_with_malformed_rows(), ACCOUNT)

        assert sorted(rows) == [1, 9, 2849]

    def test_row_of_the_example(self):
        row = tank_rows(tanks_example(), ACCOUNT)[1]

        assert row['moe_percent'] == 86.12
        assert row['marks_on_gun'] == 2
        assert row['mastery'] == 4
        assert row['expected'] == {'damage': 1180.0, 'spot': 1.42, 'frag': 0.98, 'def': 0.75, 'win_rate': 52.3}

    def test_malformed_tank_values_fall_back_to_empty(self):
        row = tank_rows(tanks_with_malformed_rows(), ACCOUNT)[9]

        assert row == {
            'tank_id': 9,
            'battles': 0,
            'win_rate': None,
            'avg_damage': None,
            'wn8': {'value': None, 'tier': None},
            'moe_percent': None,
            'marks_on_gun': None,
            'mastery': 0,
            'records': None,
            'expected': None,
        }

    def test_no_response_is_not_owned(self):
        assert not owned(None, ACCOUNT)

    def test_no_account_owns_nothing(self):
        assert not owned({'account_id': ACCOUNT}, None)

    def test_records_without_a_valid_value_are_none(self):
        assert records({'max_damage': -5, 'max_assist': 'x'}) is None

    def test_missing_records_are_none(self):
        assert records({'max_damage': 10}) == {'damage': 10, 'assist': None, 'frags': None, 'xp': None}

    def test_expected_values_need_positive_damage(self):
        assert expected({'damage': 0, 'spot': 1, 'frag': 1, 'def': 1, 'win_rate': 50}) is None

    def test_expected_values_need_every_value(self):
        assert expected({'damage': 1000, 'spot': 1, 'frag': 1, 'win_rate': 50}) is None

    def test_expected_values_need_a_dict(self):
        assert expected(['nope']) is None


class ReadStateTest(unittest.TestCase):

    def test_a_new_key_is_wanted(self):
        assert ReadState().wants('k', T0)

    def test_a_pending_key_is_not_wanted_twice(self):
        assert not pending_read().wants('k', T0)

    def test_a_finished_key_is_not_wanted_again(self):
        assert not finished_read().wants('k', T0 + 10 ** 6)

    def test_a_stale_key_is_wanted_after_its_delay(self):
        reads = finished_read()

        reads.stale(['k'], T0, 20)

        assert not reads.wants('k', T0 + 19)
        assert reads.wants('k', T0 + 20)

    def test_a_failed_key_waits_its_delay(self):
        assert not failed_read().wants('k', T0 + 59)

    def test_expedite_skips_the_failure_delay(self):
        reads = failed_read()

        reads.expedite('k')

        assert reads.wants('k', T0)

    def test_expedite_leaves_a_finished_key_alone(self):
        reads = failed_read()
        reads.expedite('k')
        reads.done(['k'])

        reads.expedite('k')

        assert not reads.wants('k', T0)

    def test_refresh_all_wants_every_key_again(self):
        reads = finished_read()

        reads.refresh_all()

        assert reads.wants('k', T0)


def first_tank_request():
    return tanks_request(CREDENTIALS, [1])


class FakeConfig(object):

    def endpoint(self, path):
        return API + path


class FakeApp(object):

    def __init__(self, credentials=CREDENTIALS):
        self.transport = _support.FakeTransport()
        self.config = FakeConfig()
        self.credentials = credentials
        self.auth_failures = 0

    def current_credentials(self):
        return self.credentials

    def on_auth_failed(self):
        self.auth_failures += 1

    def user_agent(self):
        return 'ua'


class SignedReadTest(unittest.TestCase):

    def setUp(self):
        self.app = FakeApp()
        self.reads = ReadState()
        self.account = {'id': ACCOUNT}
        self.answers = []
        self.ends = []

    def tank_read(self, build):
        return SignedRead(
            reads=self.reads,
            key=tank_key(1),
            path=TANKS_PATH,
            build=build,
            account_of=lambda: self.account['id'],
        )

    def start(self, build=None):
        return signed_read(
            self.app,
            self.tank_read(build or first_tank_request),
            lambda data, account_id: self.answers.append((data, account_id)),
            lambda: self.ends.append(True),
        )

    def test_the_built_body_is_signed_over_the_read_path(self):
        self.start()

        sent = self.app.transport.requests[0]
        assert sent['method'] == 'POST'
        assert sent['url'] == API + TANKS_PATH
        assert verify_request(CREDENTIALS.secret, 'POST', API + TANKS_PATH, sent['headers'], sent['body'])
        assert not verify_request(CREDENTIALS.secret, 'POST', API + '/mod/me/overview', sent['headers'], sent['body'])

    def test_the_key_is_pending_while_the_request_is_out(self):
        went_out = self.start()

        assert went_out
        assert not self.reads.wants(tank_key(1), T0)

    def test_an_answer_reaches_the_caller_with_its_account(self):
        self.start()

        self.app.transport.respond(200, b'{"account_id": 12345678}')

        assert self.answers == [({'account_id': ACCOUNT}, ACCOUNT)]
        assert self.ends == [True]

    def test_an_answer_marks_the_key_done(self):
        self.start()

        self.app.transport.respond(200, b'{}')

        assert not self.reads.wants(tank_key(1), time.time() + 10 ** 6)

    def test_a_failed_read_backs_the_key_off_for_the_retry_after(self):
        self.start()

        self.app.transport.respond(429, b'', {'Retry-After': '30'})

        assert self.answers == []
        assert self.ends == [True]
        assert not self.reads.wants(tank_key(1), time.time() + 25)
        assert self.reads.wants(tank_key(1), time.time() + 31)

    def test_an_answer_for_a_switched_account_is_dropped(self):
        self.start()
        self.account['id'] = ACCOUNT + 1

        self.app.transport.respond(200, b'{}')

        assert self.answers == []
        assert self.ends == []

    def test_a_refused_body_skips_the_read(self):
        def refuse():
            raise ReasonError('not_bound')

        went_out = self.start(refuse)

        assert not went_out
        assert self.app.transport.requests == []
        assert self.reads.wants(tank_key(1), T0)

    def test_an_auth_failure_pauses_the_app(self):
        self.start()

        self.app.transport.respond(401, b'{"error":"bad_signature"}')

        assert self.app.auth_failures == 1

    def test_signed_body_names_the_bound_device_and_the_fields(self):
        body = signed_body(self.app, tank_ids=[1])

        assert body == {'device_id': 'dev_me', 'account_id': ACCOUNT, 'tank_ids': [1]}


class PostJsonTest(unittest.TestCase):

    def setUp(self):
        self.app = FakeApp(credentials=None)
        self.answers = []

    def post(self):
        post_json(self.app, '/mod/x', {'a': 1}, lambda *answer: self.answers.append(answer))
        return self.app.transport.requests[-1]

    def test_posts_the_json_body_without_a_device_or_signature(self):
        request = self.post()

        assert request['method'] == 'POST'
        assert request['url'] == API + '/mod/x'
        assert request['body'] == encode_json({'a': 1})
        assert request['headers']['Content-Type'] == 'application/json'
        assert not [name for name in request['headers'] if name.lower().startswith('x-otmetki')]

    def test_an_answer_reaches_the_caller_as_json(self):
        self.post()

        self.app.transport.respond(200, b'{"ok":true}')

        assert self.answers == [(200, {'ok': True}, None)]

    def test_a_rate_limit_carries_its_retry_after(self):
        self.post()

        self.app.transport.respond(429, b'{}', {'Retry-After': '30'})

        assert self.answers == [(429, None, 30)]


if __name__ == '__main__':
    unittest.main()
