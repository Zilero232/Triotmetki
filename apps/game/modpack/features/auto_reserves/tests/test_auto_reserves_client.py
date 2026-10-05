from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig
from otmetki.core.storage import MemoryFile
from otmetki.features.auto_reserves.i18n import STRINGS

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.auto_reserves.client')
STUBBED = ('BigWorld',)
CREDITS = {'id': 7, 'kind': 'credits', 'active': False, 'ready': True, 'value': 50, 'expires': 0}
XP = {'id': 8, 'kind': 'xp', 'active': False, 'ready': True, 'value': 100, 'expires': 0}


class Config(object):

    def is_enabled(self, switch):
        return True


class Ui(object):

    def __init__(self):
        self.notes = []

    def notify(self, text):
        self.notes.append(text)


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator(STRINGS, 'en')
        self.config = Config()
        self.ui = Ui()
        self.in_battle = False
        self.account_id = 1


class AutoReservesClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED)
        self.purge()
        for name in STUBBED:
            sys.modules[name] = types.ModuleType(str(name))
        hud = importlib.import_module('otmetki.core.client.hud')
        config = ComponentConfig(MemoryFile())
        hud._state.update({'config': config})
        module = importlib.import_module('otmetki.features.auto_reserves.client')
        self.sent = []
        self.reserves = [dict(CREDITS)]
        module.personal_reserves = lambda: (list(self.reserves), {7: object(), 8: object()})
        module._activator = lambda booster: lambda: booster
        module.run_in_order = lambda steps, done, context: self.sent.append((steps, done))
        self.app = App()
        self.component = module.AutoReserves(self.app)
        config.update('auto_reserves', {'reserve_credits': True})

    def tearDown(self):
        for name, saved in self.saved.items():
            if saved is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = saved
        self.purge()

    @staticmethod
    def purge():
        _support.forget_modules(CLIENT_PREFIXES)

    def answer(self, success):
        steps, done = self.sent.pop(0)
        for step in steps:
            step()
        done(success)

    def test_the_first_hangar_activates_the_picked_reserve_once(self):
        self.app.bus.emit('hangar')
        self.answer(True)
        self.app.bus.emit('hangar')

        assert self.sent == []

    def test_nothing_is_activated_before_the_first_hangar(self):
        self.app.bus.emit('tick', 100.0)

        assert self.sent == []

    def test_an_empty_read_leaves_the_session_activation_for_a_later_hangar(self):
        self.reserves = []
        self.app.bus.emit('hangar')

        self.reserves = [dict(CREDITS)]
        self.app.bus.emit('hangar')

        assert len(self.sent) == 1

    def test_a_failed_activation_refuses_only_the_reserve_that_failed(self):
        config = importlib.import_module('otmetki.core.client.hud')._state['config']
        config.update('auto_reserves', {'reserve_xp': True})
        self.reserves = [dict(CREDITS), dict(XP)]
        self.app.bus.emit('hangar')
        steps, done = self.sent.pop(0)
        steps[0]()

        done(False)

        assert self.component.refused == set([7])

    def test_another_account_gets_its_own_first_hangar(self):
        self.app.bus.emit('hangar')
        self.answer(True)

        self.app.bus.emit('account', 2)
        self.app.bus.emit('hangar')

        assert len(self.sent) == 1

    def test_a_reserve_refused_on_one_account_is_tried_on_another(self):
        self.app.bus.emit('hangar')
        self.answer(False)

        self.app.bus.emit('account', 2)
        self.app.bus.emit('hangar')

        assert len(self.sent) == 1


if __name__ == '__main__':
    unittest.main()
