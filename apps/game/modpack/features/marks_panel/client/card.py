from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import FeatureComponent
from ....core.client.game import on_vehicle_changed, selected_tank_id, vehicle_class_tag, vehicle_short_name
from ....core.client.hud import hud_layer
from ....core.client.hud.modifier import ModifierWatch
from ....core.client.lobby_view import lobby_view
from ....core.client.me import tank_ratings
from ....core.client.moe import moe_service
from ....core.hud import EVENT_EDIT, HudPreview
from ....core.log import safe
from ..i18n import STRINGS
from ..model import hangar_state
from ..model.card import TankCard, card_text, tank_card
from ..model.constants import CARD_PREVIEW_SIZE
from ..model.preview import card_preview_text, card_preview_widget
from ..model.research import research_state
from ..settings import CARD_PANEL_ID, CARD_SCHEMA, CARD_SWITCH
from .carousel import CarouselPercent
from .history import HistoryBook
from .research import selected_research


def _ignore_key():
    pass


# The hangar Tank card of the selected tank, a component of its own: its components.json section (panel
# `hangar_marks`) holds its place and what it shows, its config.json switch turns it, the marks history it keeps and
# the carousel percent on and off. Alt is read from the game's own key events, as the HUD edit modifier is, since the
# hangar has no extended-info key of its own.
class TankCardPanel(FeatureComponent):

    def __init__(self, app):
        self.hud = hud_layer(app)
        self.moe = moe_service(app)
        self.tanks = tank_ratings(app)
        self.selected = None
        self.in_view = True
        self.alt = ModifierWatch(self._on_alt, _ignore_key)
        FeatureComponent.__init__(self, app, CARD_PANEL_ID, CARD_SCHEMA, CARD_SWITCH, STRINGS)
        self.history = HistoryBook(app, self.settings, self.enabled)
        self.carousel = CarouselPercent(self._shows_carousel_percent)
        self.preview = HudPreview(
            self.hud,
            CARD_PANEL_ID,
            self.preview_text,
            self.enabled,
            self.enabled_in_hangar,
            CARD_PREVIEW_SIZE,
            self.preview_widget,
        ).attach(app.bus)
        bus = app.bus
        bus.on('vehicle_moe', self._on_vehicle_moe)
        bus.on('hangar', self._on_hangar)
        bus.on('battle_enter', self._on_battle_enter)
        bus.on(EVENT_EDIT, self._on_edit)
        self.moe.listen(self._on_tank)
        self.tanks.listen(self._on_tank)
        on_vehicle_changed(self._on_vehicle_changed, 'marks tank card')
        lobby_view().listen(self._on_view)

    def register(self, schema):
        return self.hud.register(self.component_id, schema)

    def _shows_carousel_percent(self):
        return self.enabled() and bool(self.settings.get('carousel_percent'))

    def preview_text(self):
        return card_preview_text(self.settings, self.app.translate)

    def preview_widget(self):
        return card_preview_widget(self.settings, self.app.translate)

    def _on_view(self, visible):
        self.in_view = visible
        self.render()

    def _on_hangar(self):
        self.alt.install()
        self.render()

    def _on_vehicle_moe(self, snapshot):
        self.history.record_snapshot(snapshot)
        self._select(snapshot.get('tank_id'))

    def _on_vehicle_changed(self):
        self._select(selected_tank_id())

    def _select(self, tank_id):
        self.selected = tank_id
        if tank_id and self.settings.get('show_tank_ratings'):
            self.tanks.ensure(tank_id)
        self.render()

    def _on_tank(self, tank_id):
        if tank_id == self.selected:
            self.render()

    def _on_alt(self, held):
        self.render()

    def settings_changed(self, changed):
        self._select(self.selected)

    def _on_edit(self, active):
        if not active:
            self.render()

    def _on_battle_enter(self):
        self.preview.end()
        self.hide()

    def hide(self):
        self.hud.hide(CARD_PANEL_ID)

    @safe
    def render(self):
        if self.preview.previewing:
            return
        data = self._card() if self.enabled_in_hangar() and self.in_view else None
        if data is None:
            self.hide()
            return

        translate = self.app.translate
        text = card_text(data, self.settings, translate)
        self.hud.show(CARD_PANEL_ID, text, tank_card(data, self.settings, translate))

    def _card(self):
        if self.selected is None:
            return None
        snapshot = self.moe.snapshot(self.selected)
        tank = self.tanks.row(self.selected) if self.settings.get('show_tank_ratings') else None
        mastery = self.moe.mastery(self.selected)
        research = self._research()
        if snapshot is None and tank is None and mastery is None and research is None:
            return None
        return TankCard(
            self._state(snapshot),
            vehicle_short_name(self.selected),
            self.history.summary(self.selected),
            tank,
            self.alt.held and bool(self.settings.get('alt_detail')),
            mastery=mastery,
            own_mastery=(snapshot or {}).get('mastery'),
            research=research,
            class_tag=vehicle_class_tag(self.selected),
        )

    def _state(self, snapshot):
        if snapshot is None:
            return None
        return hangar_state(snapshot, self.moe.curve(self.selected), self.moe.pace(self.selected))

    def _research(self):
        if not self.settings.get('show_research'):
            return None
        info = selected_research()
        if info is None or info['tank_id'] != self.selected:
            return None
        return research_state(info)

    def ui_actions(self):
        return self.history.actions()

    def ui_page(self):
        return self.history.page()

    def ui_action(self, action, row=None, value=None):
        if not self.history.clear(action, row):
            return None
        self.render()
        return self.notice_info('marks_panel_history_cleared')
