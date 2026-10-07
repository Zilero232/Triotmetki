from __future__ import absolute_import, division, print_function, unicode_literals

from ...log import log_exception


def _account_settings():
    # RU 1.45 client source: account_helpers/AccountSettings.py getSettings / setSettings.
    try:
        from account_helpers.AccountSettings import AccountSettings
    except ImportError:
        return None
    return AccountSettings


def read_account_settings(names):
    store = _account_settings()
    if store is None:
        return None
    values = {}
    for name in names:
        try:
            value = store.getSettings(name)
        except Exception:
            continue
        if value is not None:
            values[name] = value
    return values


def apply_account_changed(values):
    current = read_account_settings(list(values))
    if current is None:
        return False
    store = _account_settings()
    try:
        for name, value in values.items():
            if name in current and current[name] != value:
                store.setSettings(name, value)
    except Exception:
        log_exception('apply account settings')
        return False
    return True
