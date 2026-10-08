from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.client.component import FeatureComponent
from ....core.client.game import client_attr, selected_tank_id
from ....core.events import EVENT_COMPONENT_SETTINGS, EVENT_LANGUAGE
from ....core.hooks import override
from ....core.log import log, safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import armor_url, refusal, shows_menu_option
from ..model.constants import ACTION_OPEN, ACTION_SITE, MENU_LABEL, MENU_OPTION_ID, REFUSAL_NO_SCREEN
from ..settings import SCHEMA, SWITCH
from .browser import open_external
from .constants import MENU_CLASS, MENU_MODULE
from .garage import previewed_tank_id
from .mods_list import ArmorEntry
from .screen import ArmorScreen


def _hangar_tank_id():
    return previewed_tank_id() or selected_tank_id()


# Tank armour: its own ModsList entry and the carousel tank menu open the armour screen (ArmorScreen) on the
# selected, previewed or clicked tank; greyed out in a battle queue, as hit_viewer's entry is.
class ArmorView(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.screen = ArmorScreen(self)
        self.queued = False
        self.entry = ArmorEntry(safe(lambda *args: self.open(_hangar_tank_id())))
        bus = app.bus
        bus.on('hangar', self._on_hangar)
        bus.on(EVENT_LANGUAGE, self.sync_entry)
        bus.on(EVENT_COMPONENT_SETTINGS, self._on_any_settings)
        bus.on('battle_enter', lambda: self.screen.close(restore_hangar=False))
        bus.on('enqueued', self._on_enqueued)
        bus.on('dequeued', self._on_dequeued)
        self._hook_menu()

    def _hook_menu(self):
        menu = client_attr(MENU_MODULE, MENU_CLASS)
        if menu is None:
            log('armor view: the carousel vehicle menu was not found, the menu item is off')
            return
        override(menu, '_generateOptions')(self._generate_options)
        override(menu, 'onOptionSelect')(self._on_option_select)

    def _can_open(self):
        return self.enabled() and not self.queued

    # The whole-mod switch and the language change outside this component's section, so every change syncs it.
    def sync_entry(self, *args):
        translate = self.app.translate
        name = translate('component_armor_view')
        description = translate('armor_view_mods_list')

        self.entry.show(name, description, self._can_open())

    def _on_hangar(self):
        self.queued = False
        self.sync_entry()

    def _on_enqueued(self):
        self.queued = True
        self.screen.close(restore_hangar=False)
        self.sync_entry()

    def _on_dequeued(self):
        self.queued = False
        self.sync_entry()

    def _on_any_settings(self, *args):
        self.sync_entry()
        if not self.enabled():
            self.screen.close()

    def _refused(self, tank_id):
        reason = refusal(self.enabled(), self.app.in_battle, tank_id)
        if reason is None and not self.screen.available():
            reason = REFUSAL_NO_SCREEN
        if reason is None:
            return False
        log('armor view: not opened: %s' % reason)
        self.app.ui.notify(self.app.translate(reason))
        return True

    def open(self, tank_id):
        if self.queued or self._refused(tank_id):
            return
        BigWorld.callback(0, safe(lambda: self.screen.open(tank_id)))

    def open_site(self, tank_id):
        if refusal(self.enabled(), self.app.in_battle, tank_id) is not None:
            return
        url = armor_url(tank_id, self.app.translate.language)
        log('armor view: open %s' % url)
        open_external(url)

    def ui_actions(self):
        if not self.enabled_in_hangar():
            return []
        translate = self.app.translate
        return [
            {'id': ACTION_OPEN, 'label': translate('armor_view_action_open'), 'confirm': None},
            {'id': ACTION_SITE, 'label': translate('armor_view_action_site'), 'confirm': None},
        ]

    def ui_action(self, action, row=None, value=None):
        if not self.enabled_in_hangar():
            return None
        if action == ACTION_SITE:
            self.open_site(_hangar_tank_id())
            return self.notice_info('armor_view_opening_site')
        if action != ACTION_OPEN:
            return None
        self.open(_hangar_tank_id())
        return self.notice_info('armor_view_opening')

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
        self.open(getattr(handler, 'vehCD', None))
        return None
