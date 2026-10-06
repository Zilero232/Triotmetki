from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.client.component import FeatureComponent
from ....core.client.game import vehicle_short_name
from ....core.hud import HangarLabel
from ....core.log import safe
from ..i18n import STRINGS
from ..model import clean_caravan, format_caravan, format_triathlon, triathlon_view
from ..model.constants import (
    CARAVAN_PANEL,
    HANGAR_LAYOUT,
    MIN_TIER,
    REFRESH_EVERY_S,
    STORE_FILE,
    TRIATHLON_PANEL,
)
from ..model.triathlon import TriathlonRounds, clean_event
from ..model.widget import caravan_widget, triathlon_widget
from ..settings import SCHEMA, SECTION, SWITCH
from ..settings.constants import TRIATHLON_ALWAYS
from .reads import caravan, triathlon_event


class EventTrackers(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, SECTION, SCHEMA, SWITCH, STRINGS)
        self.triathlon = HangarLabel(app, TRIATHLON_PANEL)
        self.caravan = HangarLabel(app, CARAVAN_PANEL)
        self.store = None
        self.rounds = TriathlonRounds()
        self.min_tier = MIN_TIER
        self.read_at = 0.0
        bus = app.bus
        bus.on('battle_event', self._on_battle_event)
        bus.on('tick', self._on_tick)
        bus.on('hangar', self.refresh)
        bus.on('battle_enter', self._hide)
        self.follow_account(self._on_account)

    def _on_account(self, account_id):
        self.store = self.account_file(STORE_FILE, account_id)
        self.rounds = TriathlonRounds(self.store.read({}))
        self._hide()

    def _hide(self):
        self.triathlon.hide()
        self.caravan.hide()

    def _on_battle_event(self, event, now):
        if not self.enabled() or not self.settings.get('show_triathlon'):
            return
        tank_id = (event.get('vehicle') or {}).get('tank_id')
        is_added = self.rounds.add(event, self.min_tier, vehicle_short_name(tank_id))
        if is_added and self.store is not None:
            self.store.write(self.rounds.dump())

    def settings_changed(self, changed):
        self._hide()
        self.refresh()

    def _on_tick(self, now):
        if now - self.read_at >= REFRESH_EVERY_S:
            self.read_at = now
            self.refresh()

    @safe
    def refresh(self):
        if not self.enabled_in_hangar():
            self.triathlon.clear()
            self.caravan.clear()
            return
        now = time.time()
        self._show_triathlon(now)
        self._show_caravan(now)

    def _show_triathlon(self, now):
        event = clean_event(triathlon_event())
        if event is None and self.settings.get('triathlon_shown') == TRIATHLON_ALWAYS:
            event = clean_event({})
        if event is None or not self.settings.get('show_triathlon'):
            self.triathlon.clear()
            return
        self.min_tier = event['min_tier']
        translate = self.app.translate
        view = triathlon_view(self.rounds, event, now, translate)

        text = format_triathlon(view, self.settings, translate)
        self.triathlon.show(text, HANGAR_LAYOUT, widget=triathlon_widget(view, translate))

    def _show_caravan(self, now):
        found = clean_caravan(caravan()) if self.settings.get('show_caravan') else None
        if found is None:
            self.caravan.clear()
            return
        translate = self.app.translate

        text = format_caravan(found, now, self.settings, translate)
        self.caravan.show(text, HANGAR_LAYOUT, widget=caravan_widget(found, now, translate))
