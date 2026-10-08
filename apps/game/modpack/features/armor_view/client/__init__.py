from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import FeatureComponent
from ....core.client.game import client_attr, selected_tank_id, selected_vehicle
from ....core.events import EVENT_COMPONENT_SETTINGS, EVENT_LANGUAGE, EVENT_SETTINGS_CLOSE
from ....core.hooks import override
from ....core.log import guarded, log, safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import armor_url, is_menu_option, menu_items, refusal, shows_menu_option
from ..model.constants import ACTION_HANGAR, ACTION_SITE, MENU_OPTION_ID, OPEN_IN_BROWSER
from ..settings import SCHEMA, SWITCH
from .browser import open_external, open_overlay
from .constants import CURRENT_NAME, MENU_CLASS, MENU_MODULE, PREVIEW_MODULE, PREVIEW_NAME
from .hangar_map import HangarMap
from .mods_list import ArmorEntry


@guarded('armor view: vehicle preview', False)
def _is_previewing():
    preview = client_attr(PREVIEW_MODULE, PREVIEW_NAME)
    return preview is not None and bool(preview.isPresent())


@guarded('armor view: hangar tank')
def _hangar_tank_id():
    if _is_previewing():
        preview = client_attr(PREVIEW_MODULE, PREVIEW_NAME)
        return getattr(preview.item, 'intCD', None)
    return selected_tank_id()


@guarded('armor view: selected descriptor')
def _selected_descriptor():
    return getattr(selected_vehicle(), 'descriptor', None)


@guarded('armor view: select a carousel tank')
def _select_vehicle(inventory_id):
    current = client_attr(PREVIEW_MODULE, CURRENT_NAME)
    if current is None or inventory_id is None or current.invID == inventory_id:
        return
    current.selectVehicle(inventory_id)


# Two ways to the armour of a tank, both only on the player's click and only in the hangar: the native map over the
# hangar tank (the default: instant, no browser, no view limit, the shell mode against the player's own gun) and the
# site's 3D page (any tank, also the previewed ones, where the hangar page with the map is not on the screen). The
# ModsList entry toggles the map (the site in the vehicle preview), the carousel tank menu offers both.
class ArmorView(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.map = HangarMap(app, self.settings)
        self.entry = ArmorEntry(safe(lambda *args: self.on_entry()))
        bus = app.bus
        bus.on('hangar', self.sync_entry)
        bus.on(EVENT_LANGUAGE, self.sync_entry)
        bus.on(EVENT_COMPONENT_SETTINGS, self._on_any_settings)
        bus.on('battle_enter', self.map.close)
        bus.on('enqueued', self.map.close)
        self._hook_menu()

    def _hook_menu(self):
        menu = client_attr(MENU_MODULE, MENU_CLASS)
        if menu is None:
            log('armor view: the carousel vehicle menu was not found, the menu items are off')
            return
        override(menu, '_generateOptions')(self._generate_options)
        override(menu, 'onOptionSelect')(self._on_option_select)

    # The whole-mod switch and the language change outside this component's section, so every change syncs it.
    def sync_entry(self, *args):
        translate = self.app.translate
        name = translate('component_armor_view')
        description = translate('armor_view_mods_list')

        self.entry.show(name, description, self.enabled())

    def _on_any_settings(self, *args):
        self.sync_entry()
        if not self.enabled():
            self.map.close()

    def settings_changed(self, changed):
        self.map.settings_changed()

    def _refused(self, tank_id):
        reason = refusal(self.enabled(), self.app.in_battle, tank_id)
        if reason is None:
            return False
        log('armor view: not opened: %s' % reason)
        self.app.ui.notify(self.app.translate(reason))
        return True

    def on_entry(self):
        if self.map.is_open:
            self.map.close()
            return
        if _is_previewing():
            self.open_site(_hangar_tank_id())
            return
        self.open_map()

    def open_map(self, inventory_id=None):
        attacker = _selected_descriptor()
        if self._refused(selected_tank_id()):
            return
        _select_vehicle(inventory_id)
        self.map.open(attacker)

    def open_site(self, tank_id):
        if self._refused(tank_id):
            return
        url = armor_url(tank_id, self.app.translate.language)
        log('armor view: open %s' % url)
        if self.settings.get('open_in') == OPEN_IN_BROWSER or not open_overlay(url):
            open_external(url)

    def ui_actions(self):
        if not self.enabled_in_hangar():
            return []
        translate = self.app.translate
        return [
            {'id': ACTION_HANGAR, 'label': translate('armor_view_action_hangar'), 'confirm': None},
            {'id': ACTION_SITE, 'label': translate('armor_view_action_site'), 'confirm': None},
        ]

    def ui_action(self, action, row=None, value=None):
        if not self.enabled_in_hangar():
            return None
        if action == ACTION_SITE:
            self.open_site(_hangar_tank_id())
            return self.notice_info('armor_view_opening_site')
        if action != ACTION_HANGAR:
            return None
        self.app.bus.emit(EVENT_SETTINGS_CLOSE)
        self.open_map()
        return self.notice_info('armor_view_opening_hangar')

    def _generate_options(self, original, handler, *args, **kwargs):
        options = original(handler, *args, **kwargs)
        tank_id = getattr(handler, 'vehCD', None)
        if not shows_menu_option(self.enabled(), self.app.in_battle, self.settings, tank_id):
            return options
        ours = [handler._makeItem(option_id, label) for option_id, label in menu_items(self.app.translate)]
        return list(options) + ours

    def _on_option_select(self, original, handler, option_id, *args, **kwargs):
        if not is_menu_option(option_id):
            return original(handler, option_id, *args, **kwargs)
        if option_id == MENU_OPTION_ID:
            self.open_map(getattr(handler, 'vehInvID', None))
        else:
            self.open_site(getattr(handler, 'vehCD', None))
        return None
