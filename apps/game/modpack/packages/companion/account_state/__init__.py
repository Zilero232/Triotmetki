from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import ACCOUNTS_KEY

__all__ = ('ACCOUNTS_KEY', 'AccountState')


def _accounts(state):
    accounts = state.get(ACCOUNTS_KEY) if isinstance(state, dict) else None
    return accounts if isinstance(accounts, dict) else {}


class AccountState(object):

    def __init__(self):
        self.parts = []
        self.account_id = None

    def register(self, state, key, dump, load):
        self.parts.append((key, dump, load))
        if self.account_id is not None:
            load(self.stored(state, self.account_id, key))

    def stored(self, state, account_id, key):
        slot = _accounts(state).get(str(account_id))
        if isinstance(slot, dict) and key in slot:
            return slot[key]
        return state.get(key) if isinstance(state, dict) else None

    def switch(self, state, account_id):
        state = self.saved(state)
        self.account_id = account_id
        for key, _, load in self.parts:
            load(self.stored(state, account_id, key))
        return state

    def saved(self, state):
        data = dict(state) if isinstance(state, dict) else {}
        if self.account_id is None:
            return data
        accounts = dict(_accounts(data))
        slot = accounts.get(str(self.account_id))
        slot = dict(slot) if isinstance(slot, dict) else {}
        for key, dump, _ in self.parts:
            slot[key] = dump()
            data.pop(key, None)
        accounts[str(self.account_id)] = slot
        data[ACCOUNTS_KEY] = accounts
        return data
