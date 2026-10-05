from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle import player
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.client.timer import Ticker
from ....core.log import safe
from ..i18n import STRINGS
from ..model.battle import CardQueue, card_text, card_widget, last_view
from ..model.battle.constants import LAST_SHOW_S, PREVIEW_SIZE
from ..model.preview import last_preview_text, last_preview_widget
from ..settings import LAST_PANEL_ID, LAST_SCHEMA, LAST_SWITCH, SWITCH

PANEL_SPEC = PanelSpec(
    panel_id=LAST_PANEL_ID,
    schema=LAST_SCHEMA,
    switch=LAST_SWITCH,
    strings=STRINGS,
    preview_size=PREVIEW_SIZE,
    preview_text=last_preview_text,
    preview_widget=last_preview_widget,
)


# The results of an earlier battle that reach the client during the next one (RU 1.45 Avatar.receiveBattleResults fires
# g_playerEvents.onBattleResultsReceived in battle): they show by themselves, one card at a time for LAST_SHOW_S above
# the minimap, the others queued; nothing to click. The results of this very battle are left to the hangar
# notification (no pack shows a summary of the battle being played).
class LastBattlePanel(BattlePanel):

    def __init__(self, app):
        self.queue = CardQueue()
        self.ticker = Ticker(LAST_SHOW_S, self._on_shown)
        BattlePanel.__init__(self, app, PANEL_SPEC)
        app.bus.on('battle_leave', self.queue.clear)

    def enabled(self):
        return BattlePanel.enabled(self) and bool(self.app.config.is_enabled(SWITCH))

    def offer(self, summary):
        if not self.enabled() or summary.get('arena') == getattr(player(), 'arenaUniqueID', None):
            return
        if self.queue.push(summary) and self.running:
            self._present()

    def start(self, *args):
        if self.queue.current is not None:
            self._present()

    def stop(self):
        self.ticker.stop()

    def settings_changed(self, changed):
        self.render()

    def _present(self):
        self.render()
        self.ticker.stop()
        self.ticker.start()

    def _advance(self):
        if self.queue.advance() is None:
            self.hide()
            return False
        self.render()
        return True

    def _on_shown(self):
        return self._advance()

    @safe
    def render(self):
        card = self.queue.current
        if card is None or not self.running:
            return
        view = last_view(card, self.app.translate)
        self.show(card_text(view, self.settings.get('font_size')), card_widget(view, LAST_SHOW_S))
