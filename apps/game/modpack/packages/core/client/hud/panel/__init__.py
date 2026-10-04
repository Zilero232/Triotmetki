from __future__ import absolute_import, division, print_function, unicode_literals

from ....hud import HudPreview
from ....log import log
from ....vendor import attr
from ...battle import BattleHooks
from ...component import FeatureComponent
from .. import hud_layer, panel_report, stock_control
from ..modes import current_mode, mode_details
from ..stock.constants import EXTENDED_INFO_EVENT


@attr.s(frozen=True)
class PanelSpec(object):
    """What a BattlePanel is: its HUD `panel_id` (also its settings component), settings `schema`, config `switch`,
    i18n `strings`, the edit-mode `preview_size` and the optional `preview_text` / `preview_widget` sample builders,
    each called as `(settings, translate)`."""

    panel_id = attr.ib()
    schema = attr.ib()
    switch = attr.ib()
    strings = attr.ib()
    preview_size = attr.ib()
    preview_text = attr.ib(default=None)
    preview_widget = attr.ib(default=None)


class BattlePanel(FeatureComponent):
    """A battle HUD panel of the shared HUD layer. `start(*args)` runs on `start_event` (the player's own battle, never
    a replay) when the switch is on, `stop()` on `battle_leave` and before every start; subscriptions made through
    `self.hooks` are removed and the panel is hidden then. `preview_text()` is the sample the HUD editor and the hangar
    preview show. `spec` is the panel's PanelSpec.

    At the start the layer takes the layout of the battle type (`core.hud.modes`): a panel the type leaves out does not
    start (so it replaces nothing), and the layout ends with the battle.

    `show(text, widget)` sends the GUIFlash text and the Gameface widget payload. A panel that replaces a stock element
    returns its aliases from `stock_aliases()`: they are hidden while the panel runs and the Gameface page draws
    widgets, and come back when the panel stops, is switched off or the renderer is GUIFlash.

    A panel with an alternate mode reads `extended()` (Alt held, the stock extended-info key) while it builds its
    payload and re-renders from `extended_changed(held)`, called while it runs."""

    start_event = 'battle_ready'

    def __init__(self, app, spec):
        self.hud = hud_layer(app)
        self.stock = stock_control(app)
        self.report = panel_report(app)
        self.spec = spec
        self.running = False
        FeatureComponent.__init__(self, app, spec.panel_id, spec.schema, spec.switch, spec.strings)
        self.report.track(spec.panel_id, self.enabled)
        self.hooks = BattleHooks()
        self.preview = HudPreview(
            self.hud,
            spec.panel_id,
            self.preview_text,
            self.enabled,
            self._in_hangar,
            spec.preview_size,
            self.preview_widget,
        ).attach(app.bus)
        app.bus.on(self.start_event, self._on_start)
        app.bus.on('battle_leave', self._leave_battle)
        app.bus.on(EXTENDED_INFO_EVENT, self._on_extended_info)

    def register(self, schema):
        return self.hud.register(self.component_id, schema)

    def _in_hangar(self):
        return not self.app.in_battle

    def _on_start(self, *args):
        self._on_leave()
        mode = current_mode(self.stock.page)
        if mode != self.hud.mode:
            log('HUD: battle type %s (%s)' % (mode, mode_details(self.stock.page)))
        self.hud.enter_mode(mode)
        self.wait(None)
        if self.enabled() and self.hud.allows(self.component_id):
            self.running = True
            self.start(*args)
            self.sync_stock()

    def _on_leave(self):
        self.running = False
        self.preview.end()
        self.hooks.clear()
        self.stop()
        self.hide()
        self.sync_stock()

    def _leave_battle(self):
        self._on_leave()
        self.hud.leave_mode()

    def _on_extended_info(self, held):
        if self.running:
            self.extended_changed(held)

    def extended(self):
        """True while Alt is held in battle."""
        return self.stock.extended

    def extended_changed(self, held):
        pass

    def _on_component_settings(self, component_id, changed):
        if component_id != self.component_id:
            return
        if self.running and not self.enabled():
            self._on_leave()
        elif self.running:
            self.sync_stock()
        self.settings_changed(changed)

    def stock_aliases(self):
        """The stock battle elements this panel replaces with its current settings (`core.hud.stock` aliases)."""
        return ()

    def sync_stock(self):
        replaces = self.running and self.enabled() and self.hud.renders_widgets()
        self.stock.want(self.component_id, self.stock_aliases() if replaces else ())

    def show(self, text, widget=None):
        shown = self.hud.show(self.component_id, text, widget)
        self.sync_stock()
        return shown

    def hide(self):
        self.hud.hide(self.component_id)

    def wait(self, reason):
        """Say why the panel shows nothing (None: it will show, or has nothing to explain); the battle's HUD report
        logs it."""
        self.report.note(self.component_id, reason)

    def start(self, *args):
        pass

    def stop(self):
        pass

    def preview_text(self):
        """The sample text the edit mode shows: the spec's `preview_text(settings, translate)` unless overridden."""
        if self.spec.preview_text is None:
            return ''
        return self.spec.preview_text(self.settings, self.app.translate)

    def preview_widget(self):
        """The widget the edit mode shows: the spec's `preview_widget(settings, translate)` unless overridden."""
        if self.spec.preview_widget is None:
            return None
        return self.spec.preview_widget(self.settings, self.app.translate)
