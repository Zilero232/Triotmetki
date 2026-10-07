from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle.teams import TeamTracker
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.client.native import read_settings, settings_core
from ....core.hud.stock import FRAG_CORRELATION_BAR
from ....core.log import safe
from .. import settings
from ..i18n import STRINGS
from ..model import format_panel, pinned_place, preview, replaces_stock
from ..model.constants import PREVIEW_SIZE, STOCK_STRIP_SETTINGS
from ..model.strip import strip_options
from ..model.widget import team_hp_widget
from ..settings import PANEL_ID


PANEL_SPEC = PanelSpec.of(settings, STRINGS, preview, PREVIEW_SIZE)


class TeamHpPanel(BattlePanel):

    def __init__(self, app):
        self.tracker = TeamTracker(self.render)
        self.options = strip_options(None)
        BattlePanel.__init__(self, app, PANEL_SPEC)

    def start(self, player):
        self.options = strip_options(read_settings(STOCK_STRIP_SETTINGS))
        self.hooks.add(settings_core, 'onSettingsChanged', self._on_client_settings)
        self.tracker.start(self.hooks, player)

    def stop(self):
        self.tracker.stop()

    def settings_changed(self, changed):
        self.render()

    def stock_aliases(self):
        return (FRAG_CORRELATION_BAR,) if replaces_stock(self.settings) else ()

    def _on_client_settings(self, diff):
        changed = diff or {}
        if not any(name in changed for name in STOCK_STRIP_SETTINGS):
            return

        self.options = strip_options(read_settings(STOCK_STRIP_SETTINGS))
        self.render()

    @safe
    def render(self):
        teams = self.tracker.teams
        if teams is None or not teams.vehicles:
            return

        text = format_panel(teams, self.settings, self.app.translate, self.options)
        payload = team_hp_widget(teams, self.settings, self.options)
        self.show(text, payload)

        if self.settings.get('pinned'):
            x, y = pinned_place(self.settings)
            self.hud.place(PANEL_ID, x, y)
