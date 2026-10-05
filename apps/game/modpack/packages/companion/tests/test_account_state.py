from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.companion.account_state import ACCOUNTS_KEY, AccountState

ACCOUNT_A = 1001
ACCOUNT_B = 2002


class Part(object):

    def __init__(self):
        self.value = None
        self.loads = []

    def dump(self):
        return self.value

    def load(self, value):
        self.loads.append(value)
        self.value = value


class AccountStateTest(unittest.TestCase):

    def setUp(self):
        self.accounts = AccountState()
        self.session = Part()
        self.state = {}
        self.accounts.register(self.state, 'session', self.session.dump, self.session.load)

    def switch(self, account_id):
        self.state = self.accounts.switch(self.state, account_id)

    def test_a_part_registered_before_any_account_loads_nothing(self):
        assert self.session.loads == []

    def test_another_account_starts_without_the_first_ones_part(self):
        self.switch(ACCOUNT_A)
        self.session.value = {'battles': 3}

        self.switch(ACCOUNT_B)

        assert self.session.value is None

    def test_coming_back_to_an_account_restores_its_part(self):
        self.switch(ACCOUNT_A)
        self.session.value = {'battles': 3}
        self.switch(ACCOUNT_B)

        self.switch(ACCOUNT_A)

        assert self.session.value == {'battles': 3}

    def test_saving_stores_the_part_under_the_current_account(self):
        self.switch(ACCOUNT_A)
        self.session.value = {'battles': 3}

        saved = self.accounts.saved(self.state)

        assert saved[ACCOUNTS_KEY] == {'1001': {'session': {'battles': 3}}}

    def test_a_part_stored_by_an_older_version_goes_to_the_first_account(self):
        self.state = {'session': {'battles': 7}}

        self.switch(ACCOUNT_A)

        assert self.session.value == {'battles': 7}

    def test_a_part_stored_by_an_older_version_is_not_given_to_a_second_account(self):
        self.state = {'session': {'battles': 7}}
        self.switch(ACCOUNT_A)

        self.switch(ACCOUNT_B)

        assert self.session.value is None

    def test_a_part_registered_after_the_account_loads_at_once(self):
        self.switch(ACCOUNT_A)
        self.session.value = {'battles': 3}
        self.state = self.accounts.saved(self.state)
        late = Part()

        self.accounts.register(self.state, 'session', late.dump, late.load)

        assert late.loads == [{'battles': 3}]

    def test_a_corrupt_accounts_block_is_ignored(self):
        self.state = {ACCOUNTS_KEY: ['junk']}

        self.switch(ACCOUNT_A)

        assert self.session.value is None


if __name__ == '__main__':
    unittest.main()
