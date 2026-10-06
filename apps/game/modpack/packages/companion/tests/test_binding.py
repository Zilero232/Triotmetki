from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.companion.binding import (
    BindError,
    Credentials,
    CredentialStore,
    build_bind_request,
    normalize_code,
    parse_bind_response,
)
from otmetki.core.durable import SecretPair
from _support import MemoryFile

SECRET = 'q' * 43
MALFORMED_CODES = ('ABCDEFGH2', 'ABCDEFGH20', 'ABCDEFGH2I', 'ABCDEFGH234', None)
BAD_RESPONSES = (
    ({'device_id': 'dev', 'secret': SECRET, 'account_id': 8}, 'account_mismatch'),
    ({'device_id': 'dev', 'secret': 'short', 'account_id': 7}, 'bad_response'),
    ({'error': 'code_expired'}, 'code_expired'),
    ('nope', 'bad_response'),
)


def bind_error_reason(call, *args):
    try:
        call(*args)
    except BindError as error:
        return error.reason
    return None


class FakeBox(object):

    def __init__(self, available=True):
        self.is_available = available

    def available(self):
        return self.is_available

    def seal(self, secret):
        return 'sealed:' + secret[::-1] if self.is_available else None

    def open(self, sealed):
        if not self.is_available or not isinstance(sealed, type('')) or not sealed.startswith('sealed:'):
            return None
        return sealed[len('sealed:'):][::-1]


def split_store(public=None, private=None, box=None):
    pair = SecretPair(MemoryFile(public), MemoryFile(private))
    return CredentialStore(pair, box or FakeBox()), pair


def store_with_two_accounts():
    pair = SecretPair(MemoryFile(), MemoryFile())
    store = CredentialStore(pair, FakeBox())
    store.save(Credentials('dev_a', SECRET, 7, 1))
    store.save(Credentials('dev_b', SECRET, 8, 2))
    return store, pair


class NormalizeCodeTest(unittest.TestCase):

    def test_strips_separators_and_upper_cases(self):
        self.assertEqual(normalize_code(' ab3k7-zq4m9 '), 'AB3K7ZQ4M9')

    def test_accepts_unicode_with_spaces(self):
        self.assertEqual(normalize_code(u'xyz 234 abcd'), 'XYZ234ABCD')

    def test_rejects_wrong_length_ambiguous_letters_and_none(self):
        normalized = [normalize_code(code) for code in MALFORMED_CODES]

        self.assertEqual(normalized, [None] * len(MALFORMED_CODES))


class BindRequestTest(unittest.TestCase):

    def test_request(self):
        request = build_bind_request('ab3k7zq4m9', 12345678, '0.1.0', '1.45.0', 'RU')

        self.assertEqual(request, {
            'code': 'AB3K7ZQ4M9',
            'account_id': 12345678,
            'mod_version': '0.1.0',
            'client_version': '1.45.0',
            'realm': 'RU',
        })

    def test_request_matches_contract(self):
        validator = _support.schema_validator('bind.schema.json', 'request')
        if validator is None:
            self.skipTest('jsonschema is not installed')

        request = build_bind_request('ab3k7zq4m9', 12345678, '0.1.0', '1.45.0', 'RU')

        self.assertEqual(list(validator.iter_errors(request)), [])

    def test_rejects_an_invalid_code(self):
        reason = bind_error_reason(build_bind_request, 'bad', 1, '0.1.0', '', 'RU')

        self.assertEqual(reason, 'invalid_code')

    def test_rejects_a_missing_account(self):
        reason = bind_error_reason(build_bind_request, 'AB3K7ZQ4M9', None, '0.1.0', '', 'RU')

        self.assertEqual(reason, 'no_account')


class BindResponseTest(unittest.TestCase):

    def test_response_becomes_credentials_stamped_with_the_bind_time(self):
        credentials = parse_bind_response({'device_id': 'dev_1', 'secret': SECRET, 'account_id': 7}, 7, now=100)

        self.assertEqual(credentials.to_dict(), {
            'device_id': 'dev_1',
            'secret': SECRET,
            'account_id': 7,
            'bound_at': 100,
        })

    def test_response_errors(self):
        reasons = [(data, bind_error_reason(parse_bind_response, data, 7)) for data, _ in BAD_RESPONSES]

        self.assertEqual(reasons, list(BAD_RESPONSES))


class CredentialStoreTest(unittest.TestCase):

    def test_empty_store_has_no_credentials(self):
        self.assertIsNone(split_store()[0].get(7))

    def test_keeps_credentials_per_account(self):
        _, pair = store_with_two_accounts()

        reloaded = CredentialStore(pair, FakeBox())

        self.assertEqual(reloaded.get(7).device_id, 'dev_a')
        self.assertEqual(reloaded.get(8).secret, SECRET)

    def test_the_game_folder_copy_has_no_secret(self):
        _, pair = store_with_two_accounts()

        self.assertEqual(pair.public.read(), {'accounts': {
            '7': {'device_id': 'dev_a', 'account_id': 7, 'bound_at': 1},
            '8': {'device_id': 'dev_b', 'account_id': 8, 'bound_at': 2},
        }})

    def test_the_durable_copy_holds_the_sealed_secret_only(self):
        _, pair = store_with_two_accounts()

        entry = pair.private.read()['accounts']['7']

        self.assertEqual(entry, {
            'device_id': 'dev_a', 'account_id': 7, 'bound_at': 1, 'secret_dpapi': 'sealed:' + SECRET[::-1],
        })

    def test_a_plaintext_secret_is_taken_once_and_rewritten_sealed(self):
        legacy = {'accounts': {'7': {'device_id': 'dev_a', 'secret': SECRET, 'account_id': 7, 'bound_at': 1}}}
        store, pair = split_store(public=legacy, private=legacy)

        store.migrate()

        public = pair.public.read()['accounts']['7']
        self.assertEqual(public, {'device_id': 'dev_a', 'account_id': 7, 'bound_at': 1})
        self.assertNotIn('secret', pair.private.read()['accounts']['7'])
        self.assertEqual(CredentialStore(pair, FakeBox()).get(7).secret, SECRET)

    def test_a_plaintext_secret_only_in_the_game_folder_moves_to_the_durable_copy(self):
        legacy = {'accounts': {'7': {'device_id': 'dev_a', 'secret': SECRET, 'account_id': 7}}}
        store, pair = split_store(public=legacy)

        self.assertEqual(store.get(7).secret, SECRET)
        self.assertEqual(pair.private.read()['accounts']['7']['secret_dpapi'], 'sealed:' + SECRET[::-1])
        self.assertNotIn('secret', pair.public.read()['accounts']['7'])

    def test_without_dpapi_a_plaintext_secret_is_read_but_never_written(self):
        legacy = {'accounts': {'7': {'device_id': 'dev_a', 'secret': SECRET, 'account_id': 7}}}
        store, pair = split_store(public=legacy, box=FakeBox(available=False))

        self.assertEqual(store.get(7).secret, SECRET)
        self.assertEqual(pair.public.read(), legacy)
        self.assertIsNone(pair.private.read())

    def test_without_dpapi_a_new_binding_lasts_for_the_session(self):
        store, pair = split_store(box=FakeBox(available=False))

        store.save(Credentials('dev_a', SECRET, 7, 1))

        self.assertEqual(store.get(7).device_id, 'dev_a')
        self.assertIsNone(pair.public.read())
        self.assertIsNone(pair.private.read())

    def test_without_a_durable_folder_nothing_is_written(self):
        pair = SecretPair(MemoryFile(), None)
        store = CredentialStore(pair, FakeBox())

        store.save(Credentials('dev_a', SECRET, 7, 1))

        self.assertEqual(store.get(7).device_id, 'dev_a')
        self.assertIsNone(pair.public.read())

    def test_a_secret_sealed_elsewhere_is_no_binding(self):
        private = {'accounts': {'7': {'device_id': 'dev_a', 'account_id': 7, 'secret_dpapi': 'not ours'}}}
        store, _ = split_store(public={'accounts': {'7': {'device_id': 'dev_a', 'account_id': 7}}}, private=private)

        self.assertIsNone(store.get(7))

    def unopened_store(self):
        public = {'accounts': {'7': {'device_id': 'dev_a', 'account_id': 7, 'bound_at': 5}}}
        private = {'accounts': {'7': {'device_id': 'dev_a', 'account_id': 7, 'bound_at': 5, 'secret_dpapi': 'later'}}}
        return split_store(public=public, private=private)

    def test_a_secret_that_does_not_open_keeps_both_halves(self):
        store, pair = self.unopened_store()

        store.get(7)

        self.assertEqual(pair.private.read()['accounts']['7']['secret_dpapi'], 'later')
        self.assertEqual(pair.public.read()['accounts']['7']['bound_at'], 5)

    def test_a_secret_that_does_not_open_survives_another_binding(self):
        store, pair = self.unopened_store()

        store.save(Credentials('dev_b', SECRET, 8, 6))

        self.assertEqual(sorted(pair.private.read()['accounts']), ['7', '8'])
        self.assertEqual(pair.private.read()['accounts']['7']['secret_dpapi'], 'later')

    def test_a_secret_that_does_not_open_is_reported_once(self):
        store, _ = self.unopened_store()
        lines = []

        with _support.captured_log(lines):
            for _ in range(3):
                store.get(7)

        self.assertEqual(len(lines), 1)

    def test_a_secret_that_does_not_open_can_still_be_unbound(self):
        store, pair = self.unopened_store()

        removed = store.remove(7)

        self.assertTrue(removed)
        self.assertEqual(pair.private.read()['accounts'], {})

    def test_a_missing_game_folder_copy_is_written_again(self):
        _, pair = store_with_two_accounts()
        pair.public.delete()

        CredentialStore(pair, FakeBox()).get(7)

        self.assertEqual(sorted(pair.public.read()['accounts']), ['7', '8'])

    def test_remove_forgets_the_account(self):
        store, pair = store_with_two_accounts()

        removed = store.remove(7)

        self.assertTrue(removed)
        self.assertIsNone(store.get(7))
        self.assertEqual(sorted(pair.public.read()['accounts']), ['8'])
        self.assertEqual(sorted(pair.private.read()['accounts']), ['8'])

    def test_remove_of_an_unknown_account_reports_nothing_removed(self):
        self.assertFalse(split_store()[0].remove(7))

    def test_invalid_stored_credentials_are_ignored(self):
        store, _ = split_store(private={'accounts': {'9': {'secret': 'x'}}})

        self.assertIsNone(store.get(9))


if __name__ == '__main__':
    unittest.main()
