from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle import ammo, arena, optional_devices, player
from ....core.client.hud.icons import client_file_exists
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.log import log, safe
from .. import settings
from ..i18n import STRINGS
from ..model import format_panel, loadout_summary, preview, slot_items
from ..model.constants import PREVIEW_SIZE
from ..model.widget import equipment_widget
from .constants import DEVICE_EVENTS, PERIOD_EVENT, SETUP_EVENT, VEHICLE_UPDATED_EVENT
from .reads import own_loadout


PANEL_SPEC = PanelSpec.of(settings, STRINGS, preview, PREVIEW_SIZE)


class BattleLoadoutPanel(BattlePanel):

    def __init__(self, app):
        self.devices = []
        self.summary = None
        BattlePanel.__init__(self, app, PANEL_SPEC)

    def start(self, avatar):
        self.devices = []
        for name in DEVICE_EVENTS:
            self.hooks.add(optional_devices, name, self._on_loadout)
        self.hooks.add(ammo, SETUP_EVENT, self._on_loadout)
        self.hooks.add(arena, VEHICLE_UPDATED_EVENT, self._on_vehicle_updated)
        self.hooks.add(arena, PERIOD_EVENT, self._on_loadout)
        self._on_loadout()

    def stop(self):
        self.devices = []
        self.summary = None

    # Outside the battle the layer holds the HUD edit mode's preview of the panel, which a drag or a reset changes.
    def settings_changed(self, changed):
        if self.running:
            self.render()

    def _on_vehicle_updated(self, vehicle_id, *args):
        if vehicle_id == getattr(player(), 'playerVehicleID', None):
            self._on_loadout()

    # A read that finds nothing while the row already shows the own tank's devices (the arena entry or the setups being
    # rebuilt) keeps the last row: the row never blinks for a transient read.
    def _on_loadout(self, *args):
        loadout = own_loadout()
        items = slot_items(loadout['devices'], loadout['directives'])
        if items or not self.devices:
            self._update(items)
        self.wait(None if self.devices else loadout['reason'])
        self._report(loadout, items)

    def _update(self, items):
        if items != self.devices:
            self.devices = items
            self.render()

    def _report(self, loadout, items):
        summary = loadout_summary(loadout, items, client_file_exists)
        if summary != self.summary:
            self.summary = summary
            log(summary)

    @safe
    def render(self):
        if not self.devices:
            self.hide()
            return

        self.show(format_panel(self.devices, self.settings), equipment_widget(self.devices, self.settings))
