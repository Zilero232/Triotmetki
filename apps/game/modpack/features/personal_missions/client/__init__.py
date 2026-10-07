from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import ACTION_REFRESH, CardSpec, PolledHangarCard
from ..i18n import STRINGS
from ..model import build_page, clean_missions, format_hangar
from ..model.constants import HANGAR_LAYOUT, HANGAR_PANEL, REFRESH_EVERY_S
from ..model.widget import hangar_widget
from ..settings import SCHEMA, SECTION, SWITCH
from .reads import own_missions

CARD_SPEC = CardSpec(
    section=SECTION,
    schema=SCHEMA,
    switch=SWITCH,
    strings=STRINGS,
    panel=HANGAR_PANEL,
    layout=HANGAR_LAYOUT,
    refresh_every_s=REFRESH_EVERY_S,
)


class PersonalMissionsPanel(PolledHangarCard):

    def __init__(self, app):
        self.missions = []
        PolledHangarCard.__init__(self, app, CARD_SPEC)

    def render_card(self, translate):
        self.missions, totals = clean_missions(own_missions())
        if not self.settings.get('show_hangar'):
            return None

        text = format_hangar(self.missions, self.settings, translate, totals)
        return text, hangar_widget(self.missions, self.settings, translate, totals)

    def ui_actions(self):
        if not self.enabled_in_hangar():
            return []
        return [{'id': ACTION_REFRESH, 'label': self.app.translate('pm_refresh'), 'confirm': None}]

    def ui_page(self):
        if not self.enabled_in_hangar():
            return None
        return build_page(self.missions, self.app.translate)

    def ui_action(self, action, row=None, value=None):
        if action == ACTION_REFRESH:
            self.refresh()
