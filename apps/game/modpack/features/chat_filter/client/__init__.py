from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.client.chat import battle_layout, format_controllers, is_own, is_own_command
from ....core.client.component import FeatureComponent
from ....core.compat import call
from ....core.hooks import override
from ....core.log import log
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import ChatFilter, stamp
from ..settings import SCHEMA, SWITCH


class ChatFilterFeature(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.filter = None
        self.installed = self._install()
        app.bus.on('battle_ready', self._on_battle_ready)
        app.bus.on('battle_leave', self._on_battle_leave)

    def _install(self):
        layout = battle_layout()
        controllers = format_controllers()
        if layout is None or not controllers:
            log('chat filter: battle chat classes not found, feature off')
            return False
        override(layout, 'addMessage')(self._add_message)
        override(layout, 'addCommand')(self._add_command)
        for owner in controllers:
            override(owner, '_formatMessage')(self._format_message)
        return True

    def _on_battle_ready(self, player):
        self.filter = None
        if self.enabled():
            self.filter = ChatFilter(self.settings)

    def settings_changed(self, changed):
        if not self.app.in_battle:
            return
        if not self.enabled():
            self._on_battle_leave()
        elif self.filter is None:
            self.filter = ChatFilter(self.settings)

    def _on_battle_leave(self):
        if self.filter is not None and self.filter.hidden:
            log('chat filter: %d lines hidden' % self.filter.hidden)
        self.filter = None

    # RU 1.45 messenger/gui/Scaleform/channels/layout.py: a skipped addMessage also leaves the replay chat.
    def _add_message(self, original, layout, message, *args, **kwargs):
        if self._hides_message(message):
            return True
        return original(layout, message, *args, **kwargs)

    def _hides_message(self, message):
        session_id = getattr(message, 'avatarSessionID', None)
        if self.filter is None or not session_id or is_own(session_id):
            return False
        text = getattr(message, 'text', '')
        return not self.filter.allow_message(session_id, text, time.time())

    def _add_command(self, original, layout, command, *args, **kwargs):
        if self._hides_command(command):
            return None
        return original(layout, command, *args, **kwargs)

    # RU 1.45 BattleLayout.addCommand: a command without a chat line shows nothing.
    def _hides_command(self, command):
        if self.filter is None or is_own_command(command) or call(command, 'hasNoChatMessage'):
            return False
        return not self.filter.allow_command(command.getSenderID(), time.time())

    def _format_message(self, original, controller, message, doFormatting=True):
        result = original(controller, message, doFormatting)
        timestamp_format = self.settings.get('timestamp_format')
        if self.filter is None or not doFormatting or not timestamp_format:
            return result

        is_current, text = result
        return is_current, stamp(text, timestamp_format, time.time())
