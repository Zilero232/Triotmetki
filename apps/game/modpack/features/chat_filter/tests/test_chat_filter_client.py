from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig
from otmetki.core.storage import MemoryFile
from otmetki.features.chat_filter.i18n import STRINGS

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.chat_filter.client')
LAYOUT_MODULE = 'messenger.gui.Scaleform.channels.layout'
CONTROLLERS_MODULE = 'messenger.gui.Scaleform.channels.bw_chat2.battle_controllers'
HELPERS_MODULE = 'messenger.ext.player_helpers'
STUBBED = (
    'BigWorld', 'messenger', 'messenger.gui', 'messenger.gui.Scaleform', 'messenger.gui.Scaleform.channels',
    LAYOUT_MODULE, 'messenger.gui.Scaleform.channels.bw_chat2', CONTROLLERS_MODULE, 'messenger.ext', HELPERS_MODULE,
)
OWN_SESSION = 'own'
ALLY_SESSION = 'ally'


class BattleLayout(object):

    def __init__(self):
        self.lines = []

    def addMessage(self, message, doFormatting=True):
        self.lines.append(message)
        return True

    def addCommand(self, command):
        if command.hasNoChatMessage():
            return
        self.lines.append(command)


class ChannelController(BattleLayout):

    def _formatMessage(self, message, doFormatting=True):
        return False, message


class Command(object):

    def __init__(self, sender, has_line=True):
        self.sender = sender
        self.has_line = has_line

    def getSenderID(self):
        return self.sender

    def isSender(self):
        return self.sender == OWN_SESSION

    def hasNoChatMessage(self):
        return not self.has_line


class Message(object):

    def __init__(self, session_id, text):
        self.avatarSessionID = session_id
        self.text = text


class Config(object):

    def __init__(self):
        self.switched_on = True

    def is_enabled(self, switch):
        return self.switched_on


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator(STRINGS, 'en')
        self.config = Config()
        self.in_battle = True


class ChatFilterClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED)
        self.purge()
        for name in STUBBED:
            sys.modules[name] = types.ModuleType(str(name))
        sys.modules[LAYOUT_MODULE].BattleLayout = BattleLayout
        controller = type(str('_ChannelController'), (BattleLayout,), dict(ChannelController.__dict__))
        sys.modules[CONTROLLERS_MODULE]._ChannelController = controller
        sys.modules[HELPERS_MODULE].isCurrentPlayer = lambda session_id: session_id == OWN_SESSION
        self.originals = dict((name, BattleLayout.__dict__[name]) for name in ('addMessage', 'addCommand'))
        hud = importlib.import_module('otmetki.core.client.hud')
        self.config = ComponentConfig(MemoryFile())
        hud._state['config'] = self.config
        module = importlib.import_module('otmetki.features.chat_filter.client')
        self.app = App()
        self.feature = module.ChatFilterFeature(self.app)
        self.app.bus.emit('battle_ready', None)
        self.layout = controller()

    def tearDown(self):
        for name, value in self.originals.items():
            setattr(BattleLayout, name, value)
        for name, saved in self.saved.items():
            if saved is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = saved
        self.purge()

    @staticmethod
    def purge():
        _support.forget_modules(CLIENT_PREFIXES)

    def switch(self, on):
        self.app.config.switched_on = on
        self.app.bus.emit('component_settings', 'chat_filter', ['battle_chat_filter'])

    def blocked_words(self):
        self.config.update('chat_filter', {'block_words': 'spam'})

    def test_a_filter_switched_off_in_battle_hides_nothing(self):
        self.blocked_words()
        message = Message(ALLY_SESSION, 'spam')

        self.switch(False)
        self.layout.addMessage(message)

        assert self.layout.lines == [message]

    def test_a_filter_switched_on_in_battle_starts_at_once(self):
        self.blocked_words()
        self.app.config.switched_on = False
        self.app.bus.emit('battle_ready', None)

        self.switch(True)
        self.layout.addMessage(Message(ALLY_SESSION, 'spam'))

        assert self.layout.lines == []

    def test_a_line_without_a_sender_is_never_hidden(self):
        self.blocked_words()
        message = Message(None, 'spam')

        self.layout.addMessage(message)

        assert self.layout.lines == [message]

    def test_a_line_of_sender_zero_is_never_hidden(self):
        self.blocked_words()
        message = Message(0, 'spam')

        self.layout.addMessage(message)

        assert self.layout.lines == [message]

    def test_commands_over_the_limit_are_hidden(self):
        commands = [Command(ALLY_SESSION) for _ in range(5)]

        for command in commands:
            self.layout.addCommand(command)

        assert self.layout.lines == commands[:4]

    def test_commands_without_a_chat_line_do_not_count_against_the_limit(self):
        for _ in range(4):
            self.layout.addCommand(Command(ALLY_SESSION, has_line=False))
        command = Command(ALLY_SESSION)

        self.layout.addCommand(command)

        assert self.layout.lines == [command]

    def test_commands_without_a_chat_line_are_not_counted_as_hidden(self):
        for _ in range(6):
            self.layout.addCommand(Command(ALLY_SESSION, has_line=False))

        assert self.feature.filter.hidden == 0


if __name__ == '__main__':
    unittest.main()
