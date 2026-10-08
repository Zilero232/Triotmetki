from __future__ import absolute_import, division, print_function, unicode_literals

from ..compat import string_types
from .constants import ACTION_RECOMMENDED, ACTION_RESTORE, NATIVE, ONCE_DONE, ONCE_NATIVE, ONCE_WAIT, ONCE_WRITE
from .mapping import merge_value


def _dict_of(value):
    return dict(value) if isinstance(value, dict) else {}


def client_keys(schema):
    """The keys of `schema` that are client settings: those whose choices offer 'native', sorted."""
    return tuple(sorted(key for key, choices in schema.choices.items() if NATIVE in choices))


def native_choices(keys, once=None):
    """Every key at 'native'; the key of a one-time switch (`once`) starts at its value instead."""
    values = {key: NATIVE for key in keys}
    if once is not None:
        values[once['key']] = once['value']
    return values


def once_step(once, section_value, is_chosen, game_value, wanted):
    """What a component's one-time client switch does (ONCE_*). `once` is {'key', 'value', 'off'}: the section key, the
    value it starts at and the game's value it replaces; `section_value` the section's value of that key, `is_chosen`
    whether the player set it in the window, `game_value` the client's value as read (None when unknown) and `wanted`
    the client value of `once['value']`."""
    if is_chosen or section_value != once['value']:
        return ONCE_DONE
    if game_value is None:
        return ONCE_WAIT
    if game_value == once['off']:
        return ONCE_WRITE
    if game_value == wanted:
        return ONCE_DONE
    return ONCE_NATIVE


def once_mark(component_id, revision):
    if revision <= 1:
        return component_id
    return '%s@%d' % (component_id, revision)


def recommended(schema, keys):
    """The recommended client values: the schema defaults of `keys`."""
    return {key: schema.defaults[key] for key in keys}


def is_recommended(values, schema, keys):
    return all(values.get(key) == schema.defaults[key] for key in keys)


def client_holds(current, wanted):
    """Whether the client values `current` ({name: value} as read) already are `wanted` ({name: value} a write would
    send); a name the client does not know is never written, so it does not count."""
    return all(current[name] == merge_value(current[name], value) for name, value in wanted.items() if name in current)


def offered_action(has_backup, holds_recommended):
    """The card's one button: restore while a backup exists, else the recommended values unless they are set."""
    if has_backup:
        return ACTION_RESTORE
    if holds_recommended:
        return None
    return ACTION_RECOMMENDED


class NativeState(object):
    """The client values each component replaced when the player asked for its recommended values, in state.json:
    `backups` {component: {'settings', 'account'}} of the current account (`load_backups` on an account switch);
    `once` the components whose one-time switch already ran on this install."""

    def __init__(self, backups=None, once=None):
        self.backups = _dict_of(backups)
        self.once = [name for name in once if isinstance(name, string_types)] if isinstance(once, list) else []

    def once_done(self, component_id, revision=1):
        return once_mark(component_id, revision) in self.once

    def ran_before(self, component_id, revision):
        """Whether an earlier revision of the component's one-time switch already ran."""
        return any(once_mark(component_id, earlier) in self.once for earlier in range(1, revision))

    def mark_once(self, component_id, revision=1):
        mark = once_mark(component_id, revision)
        if mark not in self.once:
            self.once.append(mark)

    def dump_once(self):
        return list(self.once)

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

    def load_backups(self, backups):
        self.backups = _dict_of(backups)
