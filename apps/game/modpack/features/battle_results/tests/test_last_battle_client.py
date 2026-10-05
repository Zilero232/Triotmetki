from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import os
import sys
import types
import unittest

import _support  # noqa: F401
from otmetki.features.battle_results.model.battle import CardQueue

CLIENT_PACKAGE = 'otmetki.features.battle_results.client'
CLIENT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'client')
PREFIXES = ('otmetki.core.client', CLIENT_PACKAGE)
ARENA = 4242


class Avatar(object):
    arenaUniqueID = ARENA


# The client package's __init__ needs the game; the panel module loads under a bare package with BigWorld stubbed.
def load_panel_module():
    big_world = types.ModuleType(str('BigWorld'))
    big_world.player = Avatar
    big_world.callback = lambda delay, fn: None
    sys.modules['BigWorld'] = big_world
    package = types.ModuleType(str(CLIENT_PACKAGE))
    package.__path__ = [CLIENT_DIR]
    sys.modules[CLIENT_PACKAGE] = package
    return importlib.import_module(CLIENT_PACKAGE + '.last_battle')


def purge():
    for name in [name for name in sys.modules if name.startswith(PREFIXES)]:
        del sys.modules[name]


class OfferTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        purge()
        module = load_panel_module()
        self.panel = module.LastBattlePanel.__new__(module.LastBattlePanel)
        self.panel.queue = CardQueue()
        self.panel.running = False
        self.panel.enabled = lambda: True

    def tearDown(self):
        purge()
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    def test_the_results_of_this_very_battle_are_left_to_the_hangar(self):
        self.panel.offer({'arena': str(ARENA)})

        assert self.panel.queue.current is None

    def test_the_results_of_an_earlier_battle_show(self):
        self.panel.offer({'arena': str(ARENA - 1)})

        assert self.panel.queue.current == {'arena': str(ARENA - 1)}


if __name__ == '__main__':
    unittest.main()
