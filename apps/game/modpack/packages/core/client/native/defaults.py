from __future__ import absolute_import, division, print_function, unicode_literals

from ...compat import string_types
from ...log import log
from ...native_settings import (
    ACTION_RECOMMENDED,
    ACTION_RESTORE,
    BACKUP_STATE_KEY,
    NATIVE,
    ONCE_NATIVE,
    ONCE_STATE_KEY,
    ONCE_WAIT,
    ONCE_WRITE,
    RETIRED_STAMP_STATE_KEY,
    USER_SET_KEY,
    NativeState,
    client_holds,
    client_keys,
    is_recommended,
    native_choices,
    offered_action,
    once_step,
    recommended,
)
from ..hud import component_config
from .account_settings import apply_account_changed, read_account_settings
from .constants import STATE_ATTR
from .settings_core import apply_settings, on_settings_synced, read_settings, settings_synced


def native_state(app):
    """The NativeState every client-settings component of `app` shares, kept in state.json."""
    state = getattr(app, STATE_ATTR, None)
    if state is not None:
        return state
    stored = app.state or {}
    state = NativeState(stored.get(BACKUP_STATE_KEY), stored.get(ONCE_STATE_KEY))
    setattr(app, STATE_ATTR, state)
    app.register_state(BACKUP_STATE_KEY, state.dump_backups)
    app.register_state(ONCE_STATE_KEY, state.dump_once)
    if isinstance(app.state, dict):
        app.state.pop(RETIRED_STAMP_STATE_KEY, None)
    return state


def section_is_new(app, component_id):
    """True while components.json has no section of `component_id` yet (call it before the component registers)."""
    return component_config(app).raw(component_id) is None


class ClientDefaults(object):
    """The schema defaults of a client-settings component as recommended client settings, written only when the
    player asks for them on the card (the recommended button), after the client values they replace are kept in
    state.json; the card then offers those back (the restore button). A section the component creates starts at
    'native' on every install, so nothing is written unasked, except the one key of `once`.

    `once` ({'key', 'value', 'off', 'log'}, or None) is the one product exception (README "Minimap"): its key starts at
    `value` and, on the first hangar, a client still at the game's `off` value is switched to it once, unless the
    player set the key in the window; state.json records that it ran, so a later choice in either window stays.

    `component` is a FeatureComponent with `client_values(values)` ((settings core values, AccountSettings values) of
    its section `values`) and `apply()` (writes the current section); `is_new_section` from `section_is_new`."""

    def __init__(self, component, is_new_section, once=None):
        self.component = component
        self.app = component.app
        self.component_id = component.component_id
        self.schema = component.settings.schema
        self.keys = client_keys(self.schema)
        self.state = native_state(self.app)
        self.once = once
        self.waiting_for_sync = False
        if is_new_section:
            self._update(native_choices(self.keys, once))

    def _update(self, values):
        component_config(self.app).update(self.component_id, values)

    def _is_chosen(self, key):
        chosen = self.app.config.get(USER_SET_KEY)
        return isinstance(chosen, string_types) and '%s.%s' % (self.component_id, key) in chosen.split()

    def apply_once(self):
        """Runs the one-time switch of `once` in the hangar, after the server settings arrive; True when it wrote the
        client setting."""
        once = self.once
        revision = once.get('revision', 1) if once is not None else 1
        if once is None or self.state.once_done(self.component_id, revision) or not self.component.enabled_in_hangar():
            return False
        if not settings_synced():
            self._wait_for_sync()
            return False
        key = once['key']
        is_chosen = self._is_chosen(key)
        if self.state.ran_before(self.component_id, revision) and not is_chosen:
            self._update({key: once['value']})
        settings, _ = self.component.client_values({key: once['value']})
        name, wanted = list(settings.items())[0]
        current = read_settings([name])
        game_value = current.get(name) if current is not None else None
        step = once_step(once, self.component.settings.to_dict().get(key), is_chosen, game_value, wanted)
        if step == ONCE_WAIT:
            return False
        if step == ONCE_WRITE:
            if not apply_settings({name: wanted}):
                return False
            log(once['log'])
        elif step == ONCE_NATIVE:
            self._update({key: NATIVE})
        self.state.mark_once(self.component_id, revision)
        self.app.save_state()
        return step == ONCE_WRITE

    def _wait_for_sync(self):
        if not self.waiting_for_sync:
            self.waiting_for_sync = on_settings_synced(self._on_synced)

    def _on_synced(self):
        self.waiting_for_sync = False
        self.apply_once()

    def _keep_backup(self, values):
        settings, account = self.component.client_values(values)
        current = read_settings(list(settings))
        if current is None:
            return False
        current_account = (read_account_settings(list(account)) or {}) if account else {}
        self.state.keep(self.component_id, current, current_account)
        return True

    def ui_actions(self):
        if self.app.in_battle:
            return []
        has_backup = self.state.backup(self.component_id) is not None
        if not has_backup and not self.component.enabled():
            return []
        holds = is_recommended(self.component.settings.to_dict(), self.schema, self.keys) and self._client_holds()
        action = offered_action(has_backup, holds)
        if action is None:
            return []
        translate = self.app.translate
        key = '%s_%s' % (self.component_id, action)
        return [{'id': action, 'label': translate(key), 'confirm': translate(key + '_confirm')}]

    def _client_holds(self):
        values = dict(self.component.settings.to_dict())
        values.update(recommended(self.schema, self.keys))
        settings, account = self.component.client_values(values)
        current = read_settings(list(settings))
        if current is None:
            return True
        current_account = (read_account_settings(list(account)) or {}) if account else {}
        return client_holds(current, settings) and client_holds(current_account, account)

    def ui_action(self, action):
        if action == ACTION_RESTORE:
            return self._restore()
        if action == ACTION_RECOMMENDED:
            return self._recommend()
        return None

    def _restore(self):
        backup = self.state.backup(self.component_id)
        if backup is None or self.app.in_battle:
            return None
        settings, account = backup
        if not apply_settings(settings) or (account and not apply_account_changed(account)):
            return self._failed()
        self._update(native_choices(self.keys))
        self.state.drop(self.component_id)
        self.app.save_state()
        return None

    def _recommend(self):
        if not self.component.enabled_in_hangar():
            return None
        wanted = recommended(self.schema, self.keys)
        values = dict(self.component.settings.to_dict())
        values.update(wanted)
        if not self._keep_backup(values):
            return self._failed()
        self._update(wanted)
        self.component.apply()
        self.app.save_state()
        return None

    def _failed(self):
        return self.component.notice_error('%s_native_failed' % self.component_id)
