"""What every feature component starts from: its strings added to the shared catalog, its settings section
of components.json, its on/off switch in config.json and `settings_changed(changed)` after the player changed
the section (bus `component_settings`). `PolledHangarCard` is the component of one hangar card read again on a
timer."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ...events import EVENT_COMPONENT_SETTINGS
from ...hud import HangarLabel
from ...hud.panel import moved_values
from ...log import safe
from ...storage import account_file
from ...vendor import attr
from ..hud import component_config
from .constants import ACTION_REFRESH, NOTICE_ERROR, NOTICE_INFO


class FeatureComponent(object):

    def __init__(self, app, component_id, schema, switch, strings):
        self.app = app
        self.component_id = component_id
        self.switch = switch
        app.translate.catalog.add(strings)
        self.settings = self.register(schema)
        app.bus.on(EVENT_COMPONENT_SETTINGS, self._on_component_settings)

    def register(self, schema):
        return component_config(self.app).section(self.component_id, schema)

    def _on_component_settings(self, component_id, changed):
        if component_id == self.component_id:
            self.settings_changed(changed)

    def settings_changed(self, changed):
        """The player changed this component's settings; `changed` holds the keys."""

    def enabled(self):
        return bool(self.app.config.is_enabled(self.switch))

    def enabled_in_hangar(self):
        return self.enabled() and not self.app.in_battle

    def follow_account(self, on_account):
        """Calls `on_account(account_id)` for the account already known and on every later one (bus `account`)."""
        self.app.bus.on('account', on_account)
        if self.app.account_id:
            on_account(self.app.account_id)

    def account_file(self, pattern, account_id):
        """The JsonFile `pattern % account_id` in the config folder, where one account's data of the component
        lives."""
        return account_file(self.app.config_dir, pattern, account_id)

    def save_place(self, props):
        """Keep where the player dragged (or how far they scaled) the component's hangar label."""
        return component_config(self.app).update(self.component_id, moved_values(props))

    def reset_place(self, keys):
        """Put the keys `keys` of the component's section back to their defaults; returns the changed keys."""
        defaults = self.settings.schema.defaults
        values = {key: defaults[key] for key in keys if key in defaults}
        return component_config(self.app).update(self.component_id, values)

    def notice_info(self, key, **params):
        """The answer of a `ui_action` the window shows as information: the translated `key`."""
        return {'kind': NOTICE_INFO, 'text': self.app.translate(key, **params)}

    def notice_error(self, key, **params):
        """The answer of a `ui_action` the window shows as an error: the translated `key`."""
        return {'kind': NOTICE_ERROR, 'text': self.app.translate(key, **params)}

    def refresh_action(self, action, unbound_key, refreshing_key, refresh):
        """The answer of a page's refresh button of the bound account's reads: None for any other `action`, the
        `unbound_key` error without a bound account, else `refresh()` runs and the answer is the `refreshing_key`
        information."""
        if action != ACTION_REFRESH:
            return None
        if not self.app.is_bound():
            return self.notice_error(unbound_key)

        refresh()
        return self.notice_info(refreshing_key)


@attr.s(frozen=True)
class CardSpec(object):
    """What a PolledHangarCard is: its settings `section`, `schema`, config `switch` and i18n `strings`, the hangar
    label alias `panel` drawn at `layout`, and `refresh_every_s`, how often the hangar reads it again."""

    section = attr.ib()
    schema = attr.ib()
    switch = attr.ib()
    strings = attr.ib()
    panel = attr.ib()
    layout = attr.ib()
    refresh_every_s = attr.ib()


class PolledHangarCard(FeatureComponent):
    """One hangar card read again every `spec.refresh_every_s` on the tick, on every hangar entry and after the
    player changed its settings; it is taken off in battle and while the switch is off. A feature implements
    `render_card(translate)`, returning `(text, widget)` or None for no card, and calls `refresh()` on its own
    events."""

    def __init__(self, app, spec):
        FeatureComponent.__init__(self, app, spec.section, spec.schema, spec.switch, spec.strings)
        self.spec = spec
        self.label = HangarLabel(app, spec.panel)
        self.read_at = 0.0
        bus = app.bus
        bus.on('tick', self._on_tick)
        bus.on('hangar', self.refresh)
        bus.on('battle_enter', self.label.hide)

    def render_card(self, translate):
        """The card's `(text, widget)`, or None when there is nothing to show."""

    def settings_changed(self, changed):
        self.label.hide()
        self.refresh()

    def _on_tick(self, now):
        if now - self.read_at >= self.spec.refresh_every_s:
            self.read_at = now
            self.refresh()

    @safe
    def refresh(self):
        card = self.render_card(self.app.translate) if self.enabled_in_hangar() else None
        if card is None:
            self.label.clear()
            return

        text, widget = card
        self.label.show(text, self.spec.layout, widget=widget)
