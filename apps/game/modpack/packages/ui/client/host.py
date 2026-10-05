from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ...companion.settings_ui.client import SettingsView, add_settings_view
from ...core.events import EVENT_MODS_LIST_ALERT, EVENT_SETTINGS_CLOSE, EVENT_SETTINGS_OPEN
from ...core.log import log, safe
from ...core.durable import open_config
from ..bridge import SettingsBridge
from ..i18n import STRINGS
from ..profiles import FILE_NAME, ProfileStore
from ..protocol import encode_state
from .constants import MODIFIER_KEY
from .context import UiContext
from .entry_points import HangarButton, ModsListButton
from .window import BattleCursor, WindowController


def _hotkey(on_press):
    try:
        from .entry_points.hotkey import Hotkey
    except ImportError:
        return None
    return Hotkey(on_press)


class GamefaceSettingsView(SettingsView):

    name = 'gameface'

    def __init__(self, app, host):
        SettingsView.__init__(self, app)
        self.host = host

    @classmethod
    def available(cls):
        return WindowController.available()

    def register(self):
        return self.host.install_entry_points()

    def refresh(self):
        self.host.push()


class UiHost(object):

    def __init__(self, app):
        self.app = app
        app.translate.catalog.add(STRINGS)
        self.profiles = ProfileStore(open_config(app.config_dir, FILE_NAME, pretty=True), time.time)
        self.bridge = SettingsBridge(UiContext(app, self))
        self.window = WindowController(self.on_message, self.state_text, self.on_escape)
        self.cursor = BattleCursor()
        self.button = HangarButton(app, self.open)
        self.mods_list = ModsListButton(self.open)
        self.hotkey = _hotkey(self.on_hotkey)
        self.on_screen_editing = False
        self.holding = False
        self.held = False
        bus = app.bus
        bus.on('battle_enter', self.on_battle_enter)
        bus.on('battle_leave', self.close)
        bus.on('hangar', self.on_hangar)
        bus.on('component_settings', self._on_changed)
        bus.on('tick', self._on_tick)
        bus.on(EVENT_SETTINGS_OPEN, self.open_at)
        bus.on(EVENT_SETTINGS_CLOSE, self.close)
        bus.on(EVENT_MODS_LIST_ALERT, self.mods_list.alert)
        if GamefaceSettingsView.available():
            add_settings_view(app, GamefaceSettingsView(app, self))
        else:
            log('ui: OpenWG Gameface not installed, the settings window stays ModsSettingsAPI / config.json')

    def install_entry_points(self):
        translate = self.app.translate
        self.apply_modifier()
        in_mods_list = self.mods_list.install(translate('mod_name'), translate('component_companion_hint'))
        if not in_mods_list:
            self.button.install()
        if self.hotkey is not None:
            self.hotkey.install()
        return True

    def state_text(self):
        return encode_state(self.bridge.state())

    @safe
    def apply_modifier(self):
        self.app.ui.set_modifier(self.app.config.get(MODIFIER_KEY))

    def push(self):
        if self.holding:
            self.held = True
            return
        self.apply_modifier()
        if self.window.is_open:
            self.window.push(self.state_text())

    def push_feed(self, force=False):
        if self.window.is_open:
            text = self.bridge.feed_text(time.time(), force)
            if text is not None:
                self.window.push_feed(text)

    @safe
    def open(self, *args):
        if self.app.in_battle:
            self.open_in_battle()
            return
        log('ui: open the settings window')
        self.mods_list.alert(False)
        if self.on_screen_editing:
            self.bridge.editor.set_editing(False)
            self.on_screen_editing = False
        if not self.window.is_open:
            self.bridge.stop_feed()
        if not self.window.open():
            self.app.ui.notify(self.app.translate('ui_gameface_missing'))

    # In battle the window opens only on the player's request (the Esc menu entry, the hotkey), over the battle with the
    # client's GUI control mode on: the cursor shown and the vehicle held while it is open.
    def open_in_battle(self):
        log('ui: open the settings window in battle')
        if self.window.is_open:
            self.window.open()
            return
        self.bridge.stop_feed()
        self.cursor.hold()
        if not self.window.open():
            self.cursor.release()

    @safe
    def open_at(self, page):
        if not self.bridge.focus_page(page):
            log('ui: no settings page %r to open' % (page,))
        if self.window.is_open:
            self.push()
            return
        self.open()

    @safe
    def close(self):
        self.bridge.clear_focus()
        self.bridge.stop_feed()
        self.window.close()
        self.cursor.release()

    @safe
    def on_hotkey(self):
        if self.on_screen_editing or not self.window.is_open:
            self.open()
        else:
            log('ui: hotkey closes the open settings window')
            self.close()

    @safe
    def on_escape(self):
        log('ui: Esc closes the settings window')
        self.bridge.editor.set_editing(False)
        self.close()

    @safe
    def on_message(self, raw):
        self.holding, self.held = True, False
        try:
            changed = self.bridge.handle(raw)
        finally:
            self.holding = False
        if changed or self.held:
            self.push()
        self.push_feed(force=True)

    @safe
    def _on_tick(self, now):
        self.push_feed()

    def on_hud_editing(self, active):
        self.on_screen_editing = active
        if active:
            self.close()
            self.app.ui.notify(self.app.translate('ui_hud_edit_hint'))

    def on_hangar(self):
        self.button.show()

    def on_battle_enter(self):
        self.bridge.editor.set_editing(False)
        self.on_screen_editing = False
        self.close()

    def _on_changed(self, component_id, changed):
        self.push()
