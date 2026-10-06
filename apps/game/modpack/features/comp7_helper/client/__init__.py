from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import CardSpec, PolledHangarCard
from ....core.client.game import on_vehicle_changed
from ..i18n import STRINGS
from ..model import clean_state, format_hangar
from ..model.battles import clean_history, own_battle, record
from ..model.constants import HANGAR_LAYOUT, HANGAR_PANEL, HISTORY_FILE, REFRESH_EVERY_S
from ..model.widget import hangar_widget
from ..settings import SCHEMA, SECTION, SWITCH
from .reads import comp7_state

CARD_SPEC = CardSpec(
    section=SECTION,
    schema=SCHEMA,
    switch=SWITCH,
    strings=STRINGS,
    panel=HANGAR_PANEL,
    layout=HANGAR_LAYOUT,
    refresh_every_s=REFRESH_EVERY_S,
)


class Comp7Helper(PolledHangarCard):

    def __init__(self, app):
        self.history_file = None
        self.history = []
        PolledHangarCard.__init__(self, app, CARD_SPEC)
        on_vehicle_changed(self.refresh, 'comp7 helper')
        self.follow_account(self._on_account)
        app.bus.on('battle_results', self._on_battle_results)

    def _on_account(self, account_id):
        self.history_file = self.account_file(HISTORY_FILE, account_id)
        self.history = clean_history(self.history_file.read([]))

    def _on_battle_results(self, arena_id, results):
        battle = own_battle(arena_id, results)
        if battle is None or self.history_file is None:
            return
        history = record(self.history, battle)
        if history is not self.history:
            self.history = history
            self.history_file.write(history)

    def render_card(self, translate):
        state = clean_state(comp7_state())
        if state is not None:
            state['battles'] = self.history
        text = format_hangar(state, self.settings, translate)
        if text is None:
            return None
        return text, hangar_widget(state, self.settings, translate)
