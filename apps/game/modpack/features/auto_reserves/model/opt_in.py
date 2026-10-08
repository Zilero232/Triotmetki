from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int


def clean_state(raw):
    if not isinstance(raw, dict):
        return {'accounts': [], 'migrated': False}

    accounts = []
    for account_id in raw.get('accounts') or ():
        if is_int(account_id) and account_id not in accounts:
            accounts.append(account_id)

    return {'accounts': sorted(accounts), 'migrated': bool(raw.get('migrated'))}


def is_opted_in(state, account_id):
    return account_id in state['accounts']


def with_choice(state, account_id, is_chosen):
    accounts = []
    for known_id in state['accounts']:
        if known_id != account_id:
            accounts.append(known_id)
    if is_chosen:
        accounts.append(account_id)

    return {'accounts': sorted(accounts), 'migrated': state['migrated']}


def migrated(state, account_id, is_switch_on):
    if state['migrated']:
        return state

    is_carried_over = is_switch_on and is_int(account_id)
    carried = with_choice(state, account_id, is_carried_over)

    return {'accounts': carried['accounts'], 'migrated': True}
