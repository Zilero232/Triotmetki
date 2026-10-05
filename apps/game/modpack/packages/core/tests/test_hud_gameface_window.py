from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support  # noqa: F401

STUBBED = ('BigWorld', 'frameworks', 'frameworks.wulf', 'gui', 'gui.impl', 'gui.impl.pub', 'openwg_gameface')
GAMEFACE_MODULE = 'otmetki.core.client.hud.gameface'


class Constants(object):
    WINDOW = 1
    VIEW = 1


class ClientWindow(object):

    def __init__(self, wndFlags=None, content=None, layer=None, parent=None):
        self.shown = []

    def show(self, focus=True):
        self.shown.append(focus)

    def _onReady(self):
        self.show()


class ClientViewModel(object):

    def __init__(self, properties=0, commands=0):
        pass


class ClientView(object):

    def __init__(self, settings):
        pass


def install_stubs():
    for name in STUBBED:
        sys.modules[name] = types.ModuleType(str(name))
    wulf = sys.modules['frameworks.wulf']
    wulf.ViewFlags = wulf.WindowFlags = wulf.WindowLayer = wulf.WindowStatus = Constants
    wulf.ViewModel = ClientViewModel
    wulf.ViewSettings = lambda layout, flags=None, model=None: None
    sys.modules['gui.impl.pub'].WindowImpl = ClientWindow
    sys.modules['gui.impl.pub'].ViewImpl = ClientView


class HudWindowTest(unittest.TestCase):

    def setUp(self):
        self.loaded = set(sys.modules)
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED + (GAMEFACE_MODULE,))
        install_stubs()
        sys.modules.pop(GAMEFACE_MODULE, None)
        self.gameface = importlib.import_module(GAMEFACE_MODULE)
        self.gameface.main_window = lambda: None

    def tearDown(self):
        for name in set(sys.modules) - self.loaded:
            del sys.modules[name]
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def test_the_ready_window_shows_without_taking_the_keyboard_focus(self):
        window = self.gameface.HudWindow(1, None)

        window._onReady()

        self.assertEqual(window.shown, [False])


if __name__ == '__main__':
    unittest.main()
