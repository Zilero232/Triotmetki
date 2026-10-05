from __future__ import absolute_import, division, print_function, unicode_literals

from ...native_settings import changed_values
from ..component import FeatureComponent
from .account_settings import apply_account_changed
from .defaults import ClientDefaults, section_is_new
from .settings_core import apply_changed


class NativeSettingsComponent(FeatureComponent):
    """A component whose values become the player's client settings. They are written only when the
    player changes them (the settings window, a profile load: bus `component_settings`) and only in the
    hangar, so a later change in the game's own settings window is never overridden (a RecommendedSettingsComponent
    also writes its defaults once on a fresh install). A change writes only the client settings it moves; one made in
    battle (the window opened from the Esc menu) is written on the next hangar. `to_account` maps the
    values kept in the client's AccountSettings instead of the settings core (the minimap size)."""

    def __init__(self, app, component_id, schema, switch, strings, to_native, to_account=None):
        FeatureComponent.__init__(self, app, component_id, schema, switch, strings)
        self.to_native = to_native
        self.to_account = to_account
        self.written = None
        self.pending = False
        app.bus.on('hangar', self._on_hangar_native)

    def desired(self):
        return self.to_native(self.settings.to_dict())

    def client_values(self, values):
        """(settings core values, AccountSettings values) of the section `values`."""
        account = self.to_account(values) if self.to_account is not None else {}
        return self.to_native(values), account

    def current_client_values(self):
        values = self.settings.to_dict()
        account = self.to_account(values) if self.to_account is not None else {}
        return self.desired(), account

    def settings_changed(self, changed):
        if self.enabled_in_hangar():
            self.apply_changes()
        elif self.enabled():
            self.pending = True

    def _on_hangar_native(self):
        if self.pending and self.enabled_in_hangar():
            self.apply_changes()
        elif self.written is None:
            self.written = self.current_client_values()

    def apply_changes(self):
        """Write the client settings the section moved since the last write (all of them before the first hangar)."""
        if self.written is None:
            return self.apply()
        native, account = self.current_client_values()
        written_native, written_account = self.written
        return self._write(changed_values(written_native, native), changed_values(written_account, account))

    def apply(self):
        return self._write(*self.current_client_values())

    def _write(self, native, account):
        current = self.current_client_values()
        applied = apply_changed(native)
        if account and not apply_account_changed(account):
            return False
        if applied:
            self.pending = False
            self.written = current
        return applied


class RecommendedSettingsComponent(NativeSettingsComponent):
    """A NativeSettingsComponent whose schema defaults are the recommended client settings: written once on a fresh
    install with a backup, and offered on its card (`ClientDefaults`)."""

    def __init__(self, app, component_id, schema, switch, strings, to_native, to_account=None):
        is_new_section = section_is_new(app, component_id)
        NativeSettingsComponent.__init__(self, app, component_id, schema, switch, strings, to_native, to_account)
        self.client_defaults = ClientDefaults(self, is_new_section)

    def ui_actions(self):
        return self.client_defaults.ui_actions()

    def ui_action(self, action, row=None, value=None):
        return self.client_defaults.ui_action(action)
