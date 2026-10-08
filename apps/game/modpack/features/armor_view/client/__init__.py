from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import FeatureComponent
from ....core.client.game import client_attr, selected_tank_id
from ....core.hooks import override
from ....core.log import guarded, log, safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import armor_url, is_menu_option, refusal, shows_menu_option
from ..model.constants import MENU_OPTION_ID, OPEN_IN_BROWSER
from ..settings import SCHEMA, SWITCH
from .browser import open_external, open_overlay
from .constants import MENU_CLASS, MENU_MODULE, PREVIEW_MODULE, PREVIEW_NAME
from .mods_list import ArmorEntry


# Opens the site's public armour page only on the player's click: its ModsList entry or the carousel tank menu.
class ArmorView(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.entry = ArmorEntry(safe(lambda *args: self.open(_hangar_tank_id())))
        app.bus.on('hangar', self._on_hangar)
        menu = client_attr(MENU_MODULE, MENU_CLASS)
        if menu is None:
            log('armor view: the carousel vehicle menu was not found, the menu item is off')
            return
        override(menu, '_generateOptions')(self._generate_options)
        override(menu, 'onOptionSelect')(self._on_option_select)

    def _on_hangar(self):
        translate = self.app.translate
        self.entry.show(translate('component_armor_view'), translate('armor_view_mods_list'), self.enabled())

    def open(self, tank_id):
        reason = refusal(self.enabled(), self.app.in_battle, tank_id)
        if reason is not None:
            log('armor view: not opened: %s' % reason)
            self.app.ui.notify(self.app.translate(reason))
            return
        url = armor_url(tank_id, self.app.translate.language)
        log('armor view: open %s' % url)
        if self.settings.get('open_in') == OPEN_IN_BROWSER or not open_overlay(url):
            open_external(url)

    def _generate_options(self, original, handler, *args, **kwargs):
        options = original(handler, *args, **kwargs)
        tank_id = getattr(handler, 'vehCD', None)
        if not shows_menu_option(self.enabled(), self.app.in_battle, self.settings, tank_id):
            return options
        return list(options) + [handler._makeItem(MENU_OPTION_ID, self.app.translate('armor_view_menu'))]

    def _on_option_select(self, original, handler, option_id, *args, **kwargs):
        if not is_menu_option(option_id):
            return original(handler, option_id, *args, **kwargs)
        self.open(getattr(handler, 'vehCD', None))
        return None


@guarded('armor view: hangar tank')
def _hangar_tank_id():
    preview = client_attr(PREVIEW_MODULE, PREVIEW_NAME)
    if preview is not None and preview.isPresent():
        return getattr(preview.item, 'intCD', None)
    return selected_tank_id()
