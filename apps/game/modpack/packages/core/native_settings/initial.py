from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import ACTION_RECOMMENDED, ACTION_RESTORE, NATIVE


def _dict_of(value):
    return dict(value) if isinstance(value, dict) else {}


def client_keys(schema):
    """The keys of `schema` that are client settings: those whose choices offer 'native', sorted."""
    return tuple(sorted(key for key, choices in schema.choices.items() if NATIVE in choices))


def native_choices(keys):
    return dict((key, NATIVE) for key in keys)


def recommended(schema, keys):
    """The recommended client values: the schema defaults of `keys`."""
    return dict((key, schema.defaults[key]) for key in keys)


def is_recommended(values, schema, keys):
    return all(values.get(key) == schema.defaults[key] for key in keys)


def offered_action(has_backup, holds_recommended):
    """The card's one button: restore while a backup exists, else the recommended values unless they are set."""
    if has_backup:
        return ACTION_RESTORE
    if holds_recommended:
        return None
    return ACTION_RECOMMENDED


class NativeState(object):
    """The client values each component replaced when the player asked for its recommended values, in state.json:
    `backups` {component: {'settings', 'account'}}."""

    def __init__(self, backups=None):
        self.backups = _dict_of(backups)

    def backup(self, component_id):
        backup = self.backups.get(component_id)
        if not isinstance(backup, dict):
            return None
        return _dict_of(backup.get('settings')), _dict_of(backup.get('account'))

    def keep(self, component_id, settings, account):
        self.backups[component_id] = {'settings': dict(settings), 'account': dict(account)}

    def drop(self, component_id):
        self.backups.pop(component_id, None)

    def dump_backups(self):
        return dict(self.backups)
