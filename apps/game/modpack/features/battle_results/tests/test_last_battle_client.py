from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import os
import sys
import types
import unittest

import _support
from otmetki.features.battle_results.model.battle import CardQueue

CLIENT_PACKAGE = 'otmetki.features.battle_results.client'
CLIENT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'client')
PREFIXES = ('otmetki.core.client', CLIENT_PACKAGE)
ARENA = 4242
STOCK_SHOWS = {'arena': True, 'server': True, 'option': True}
STOCK_OFF = {'arena': True, 'server': False, 'option': True}


class Avatar(object):
    arenaUniqueID = ARENA


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
    _support.forget_modules(PREFIXES)


class OfferTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        purge()
        module = load_panel_module()
        self.module = module
        self.reads = []
        self.notifier = dict(STOCK_OFF)
        module.notifier_reads = self.read_notifier
        self.panel = module.LastBattlePanel.__new__(module.LastBattlePanel)
        self.panel.queue = CardQueue()
        self.panel.running = False
        self.panel.notifier_battle = None
        self.panel.stock_shows = False
        self.panel.enabled = lambda: True

    def read_notifier(self):
        self.reads.append(1)
        return self.notifier

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

    def test_the_card_stays_hidden_while_the_stock_notifier_shows_the_results(self):
        self.notifier = dict(STOCK_SHOWS)

        self.panel.offer({'arena': str(ARENA - 1)})

        assert self.panel.queue.current is None

    def test_the_stock_notifier_is_read_once_per_battle(self):
        self.panel.offer({'arena': str(ARENA - 1)})
        self.panel.offer({'arena': str(ARENA - 2)})

        assert len(self.reads) == 1


if __name__ == '__main__':
    unittest.main()
