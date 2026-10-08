from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import FeatureComponent
from ....core.client.game import client_attr, selected_tank_id
from ....core.events import EVENT_COMPONENT_SETTINGS, EVENT_LANGUAGE
from ....core.hooks import override
from ....core.log import guarded, log, safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import armor_url, refusal, shows_menu_option
from ..model.constants import ACTION_SITE, MENU_LABEL, MENU_OPTION_ID, OPEN_IN_GAME
from ..settings import SCHEMA, SWITCH
from .browser import open_external, open_overlay
from .constants import MENU_CLASS, MENU_MODULE, PREVIEW_MODULE, PREVIEW_NAME
from .mods_list import ArmorEntry


@guarded('armor view: vehicle preview')
def _previewed_tank_id():
    preview = client_attr(PREVIEW_MODULE, PREVIEW_NAME)
    if preview is None or not preview.isPresent():
        return None
    return getattr(preview.item, 'intCD', None)


def _hangar_tank_id():
    return _previewed_tank_id() or selected_tank_id()


# Tank armour: its own ModsList entry opens the site's 3D armour page of the tank selected in the hangar (or the
# previewed one), the carousel tank menu that of the clicked tank.
class ArmorView(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.entry = ArmorEntry(safe(lambda *args: self.open_site(_hangar_tank_id())))
        bus = app.bus
        bus.on('hangar', self.sync_entry)
        bus.on(EVENT_LANGUAGE, self.sync_entry)
        bus.on(EVENT_COMPONENT_SETTINGS, self.sync_entry)
        self._hook_menu()

    def _hook_menu(self):
        menu = client_attr(MENU_MODULE, MENU_CLASS)
        if menu is None:
            log('armor view: the carousel vehicle menu was not found, the menu item is off')
            return
        override(menu, '_generateOptions')(self._generate_options)
        override(menu, 'onOptionSelect')(self._on_option_select)

    # The whole-mod switch and the language change outside this component's section, so every change syncs it.
    def sync_entry(self, *args):
        translate = self.app.translate
        name = translate('component_armor_view')
        description = translate('armor_view_mods_list')

        self.entry.show(name, description, self.enabled())

    def _refused(self, tank_id):
        reason = refusal(self.enabled(), self.app.in_battle, tank_id)
        if reason is None:
            return False
        log('armor view: not opened: %s' % reason)
        self.app.ui.notify(self.app.translate(reason))
        return True

    def open_site(self, tank_id):
        if self._refused(tank_id):
            return
        url = armor_url(tank_id, self.app.translate.language)
        log('armor view: open %s' % url)
        is_overlay = self.settings.get('open_in') == OPEN_IN_GAME
        if is_overlay and open_overlay(url):
            return
        open_external(url)

    def ui_actions(self):
        if not self.enabled_in_hangar():
            return []
        label = self.app.translate('armor_view_action_site')
        return [{'id': ACTION_SITE, 'label': label, 'confirm': None}]

    def ui_action(self, action, row=None, value=None):
        if not self.enabled_in_hangar() or action != ACTION_SITE:
            return None
        self.open_site(_hangar_tank_id())
        return self.notice_info('armor_view_opening_site')

    def _generate_options(self, original, handler, *args, **kwargs):
        options = original(handler, *args, **kwargs)
        tank_id = getattr(handler, 'vehCD', None)
        if not shows_menu_option(self.enabled(), self.app.in_battle, self.settings, tank_id):
            return options
        ours = handler._makeItem(MENU_OPTION_ID, self.app.translate(MENU_LABEL))
        return list(options) + [ours]

    def _on_option_select(self, original, handler, option_id, *args, **kwargs):
        if option_id != MENU_OPTION_ID:
            return original(handler, option_id, *args, **kwargs)
        self.open_site(getattr(handler, 'vehCD', None))
        return None
