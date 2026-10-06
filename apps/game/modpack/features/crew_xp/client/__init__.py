from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import CardSpec, PolledHangarCard
from ....core.client.game import client_attr, on_vehicle_changed
from ....core.hooks import override
from ....core.log import guarded
from ..i18n import STRINGS
from ..model import clean_crew, clean_member, format_hangar, tooltip_text
from ..model.constants import HANGAR_LAYOUT, HANGAR_PANEL, REFRESH_EVERY_S
from ..model.widget import hangar_widget
from ..settings import SCHEMA, SECTION, SWITCH
from .constants import FEATURE_CLASS, FEATURE_MODULE, TOOLTIP_CLASS, TOOLTIP_METHOD, TOOLTIP_MODULE
from .reads import selected_crew, tankman_member

CARD_SPEC = CardSpec(
    section=SECTION,
    schema=SCHEMA,
    switch=SWITCH,
    strings=STRINGS,
    panel=HANGAR_PANEL,
    layout=HANGAR_LAYOUT,
    refresh_every_s=REFRESH_EVERY_S,
)


class CrewXp(PolledHangarCard):

    def __init__(self, app):
        PolledHangarCard.__init__(self, app, CARD_SPEC)
        on_vehicle_changed(self.refresh, 'crew xp')
        self._install_tooltip()

    def render_card(self, translate):
        if not self.settings.get('show_card'):
            return None
        crew = clean_crew(selected_crew())
        text = format_hangar(crew, self.settings, translate)
        return (text, hangar_widget(crew, translate)) if text else None

    def _install_tooltip(self):
        tooltip = client_attr(TOOLTIP_MODULE, TOOLTIP_CLASS)
        if tooltip is None or getattr(tooltip, TOOLTIP_METHOD, None) is None:
            return
        self._override_tooltip(tooltip)

    @guarded('crew xp: tooltip')
    def _override_tooltip(self, tooltip):
        override(tooltip, TOOLTIP_METHOD)(self._fill_tooltip)

    def _fill_tooltip(self, original, view, *args, **kwargs):
        result = original(view, *args, **kwargs)
        if self.enabled_in_hangar() and self.settings.get('show_tooltip'):
            self._add_line(view)
        return result

    def _add_line(self, view):
        member = clean_member(tankman_member(getattr(view, 'tankmanID', None)))
        feature_class = client_attr(FEATURE_MODULE, FEATURE_CLASS)
        if member is None or feature_class is None:
            return
        line = feature_class()
        line.setDescription(tooltip_text(member, self.app.translate))
        with view.viewModel.transaction() as model:
            model.getCommanderFeatures().addViewModel(line)
