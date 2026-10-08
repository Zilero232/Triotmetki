from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.chat import battle_layout, is_own, is_own_command
from ....core.client.component import FeatureComponent
from ....core.client.hotkey import HotkeyChoice
from ....core.client.hud import hud_layer
from ....core.hooks import override
from ....core.log import log, safe
from ..i18n import STRINGS
from ..model import PanelToggle, blocked_labels, blocked_panels, hides_chat, is_player_line
from ..model.constants import HOTKEYS
from ..settings import SCHEMA, SECTION, SWITCH


class StreamerMode(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, SECTION, SCHEMA, SWITCH, STRINGS)
        self.toggle = PanelToggle()
        self.hotkey = HotkeyChoice(HOTKEYS, self._on_hotkey)
        self.hotkey_choice = None
        self._hook_chat()
        bus = app.bus
        bus.on('hangar', self._on_hangar)
        bus.on('battle_ready', self._on_battle_ready)

    def _hook_chat(self):
        layout = battle_layout()
        if layout is None:
            log('streamer mode: battle chat classes not found, the chat stays')
            return
        override(layout, 'addMessage')(self._add_message)
        override(layout, 'addCommand')(self._add_command)

    def _on_hangar(self):
        self._install_hotkey()
        self._apply_private()

    def _on_battle_ready(self, player):
        keep_hidden = self.enabled() and self.settings.get('keep_hidden')
        self._set_hidden(self.toggle.battle_started(keep_hidden))

    def settings_changed(self, changed):
        self._install_hotkey()
        self._apply_private()

    def _install_hotkey(self):
        choice = 'none'
        if self.enabled():
            choice = self.settings.get('hotkey')
        if choice == self.hotkey_choice:
            return

        self.hotkey_choice = choice
        has_hotkey = self.hotkey.set(choice)
        if not has_hotkey and self.toggle.hidden:
            self.toggle.hidden = False
            self._set_hidden(False)

    @safe
    def _on_hotkey(self):
        if not self.enabled():
            return
        hidden = self.toggle.toggle()
        self._set_hidden(hidden)
        if not self.app.in_battle:
            self._notify_toggled(hidden)

    def _notify_toggled(self, hidden):
        translate = self.app.translate
        hotkey = translate('streamer_mode_hotkey_%s' % self.hotkey_choice)
        key = 'streamer_mode_hidden' if hidden else 'streamer_mode_shown'
        self.app.ui.notify(translate(key, hotkey=hotkey))

    def _set_hidden(self, hidden):
        hud_layer(self.app).set_muted(hidden)
        self.app.ui.set_muted(hidden)

    def _apply_private(self):
        labels = ()
        panels = ()
        if self.enabled():
            labels = blocked_labels(self.settings)
            panels = blocked_panels(self.settings)

        self.app.ui.set_blocked(labels)
        hud_layer(self.app).set_blocked(panels)

    def _hides_chat(self):
        return self.enabled() and hides_chat(self.settings, self.app.in_battle)

    def _add_message(self, original, layout, message, *args, **kwargs):
        session_id = getattr(message, 'avatarSessionID', None)
        if self._hides_chat() and is_player_line(session_id, is_own(session_id)):
            return True
        return original(layout, message, *args, **kwargs)

    def _add_command(self, original, layout, command, *args, **kwargs):
        if self._hides_chat() and not is_own_command(command):
            return None
        return original(layout, command, *args, **kwargs)
