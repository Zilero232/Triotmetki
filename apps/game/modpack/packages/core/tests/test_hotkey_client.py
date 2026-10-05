from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support  # noqa: F401

CLIENT_PREFIX = 'otmetki.core.client'
KEY_H = 35
STUB_MODULES = ('BigWorld', 'Keys', 'gui', 'messenger')


class Event(object):

    def __init__(self):
        self.handlers = []

    def __iadd__(self, handler):
        self.handlers.append(handler)
        return self

    def __isub__(self, handler):
        self.handlers.remove(handler)
        return self

    def __call__(self, *args):
        for handler in list(self.handlers):
            handler(*args)


class KeyEvent(object):

    def __init__(self, key):
        self.key = key

    def isRepeatedEvent(self):
        return False


class ChatGui(object):

    def __init__(self):
        self.focused = False

    def isFocused(self):
        return self.focused


class Namespace(object):

    def __init__(self, **attrs):
        self.__dict__.update(attrs)


def _module(name, **attrs):
    module = types.ModuleType(str(name))
    module.__dict__.update(attrs)
    return module


class HotkeyChatFocusTest(unittest.TestCase):

    def setUp(self):
        self.saved = dict((name, sys.modules.get(name)) for name in STUB_MODULES)
        self.key_down = Event()
        self.chat = ChatGui()
        input_handler = Namespace(onKeyDown=self.key_down)
        sys.modules['BigWorld'] = _module('BigWorld', isKeyDown=lambda key: True)
        sys.modules['Keys'] = _module('Keys', KEY_H=KEY_H)
        sys.modules['gui'] = _module('gui', InputHandler=Namespace(g_instance=input_handler))
        entry = Namespace(g_instance=Namespace(gui=self.chat))
        sys.modules['messenger'] = _module('messenger', MessengerEntry=entry)
        hotkey = importlib.import_module('otmetki.core.client.hotkey')
        self.presses = []
        self.hotkey = hotkey.Hotkey('KEY_H', (), lambda: self.presses.append(True))
        self.hotkey.install()

    def tearDown(self):
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module
        for name in [name for name in sys.modules if name.startswith(CLIENT_PREFIX)]:
            del sys.modules[name]

    def test_the_key_presses_the_hotkey(self):
        self.key_down(KeyEvent(KEY_H))

        assert self.presses == [True]

    def test_the_key_typed_into_the_battle_chat_presses_nothing(self):
        self.chat.focused = True

        self.key_down(KeyEvent(KEY_H))

        assert self.presses == []


if __name__ == '__main__':
    unittest.main()
