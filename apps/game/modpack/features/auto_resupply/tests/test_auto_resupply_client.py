from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig
from _support import MemoryFile
from otmetki.features.auto_resupply.i18n import STRINGS
from otmetki.features.auto_resupply.model import ACTION_SELECTED

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.auto_resupply.client')
STUBBED = ('BigWorld',)
INVENTORY_ID = 7


class Config(object):

    def is_enabled(self, switch):
        return True


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator(STRINGS, 'en')
        self.config = Config()
        self.in_battle = False


class Vehicle(object):

    invID = INVENTORY_ID


def vehicle_summary(vehicle):
    return {'inv_id': INVENTORY_ID, 'locked': False, 'flags': {'auto_repair': False}}


class AutoResupplyClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        self.purge()
        for name in STUBBED:
            sys.modules[name] = types.ModuleType(str(name))
        self.later = []
        sys.modules['BigWorld'].callback = self.schedule
        hud = importlib.import_module('otmetki.core.client.hud')
        config = ComponentConfig(MemoryFile())
        hud._state.update({'config': config})
        module = importlib.import_module('otmetki.features.auto_resupply.client')
        self.sent = []
        module.selected_vehicle = Vehicle
        module.summary = vehicle_summary
        module.send = self.record_send
        self.app = App()
        self.component = module.AutoResupply(self.app)
        config.update('auto_resupply', {'auto_repair': 'on'})

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

    def schedule(self, delay, callback):
        self.later.append(callback)

    def run_later(self):
        callbacks = self.later
        self.later = []
        for callback in callbacks:
            callback()

    def answer_first(self, success=True):
        _, _, done = self.sent[0]
        done(success)
        self.run_later()

    def record_send(self, vehicle, flag, value, done):
        self.sent.append((flag, value, done))

    def test_a_press_sends_the_request(self):
        self.component.ui_action(ACTION_SELECTED)

        assert len(self.sent) == 1

    def test_a_second_press_while_the_queue_drains_is_refused(self):
        self.component.ui_action(ACTION_SELECTED)

        notice = self.component.ui_action(ACTION_SELECTED)

        assert notice['kind'] == 'error'

    def test_a_second_press_while_the_queue_drains_sends_nothing(self):
        self.component.ui_action(ACTION_SELECTED)

        self.component.ui_action(ACTION_SELECTED)

        assert len(self.sent) == 1

    def test_the_buttons_hide_while_the_queue_drains(self):
        self.component.ui_action(ACTION_SELECTED)

        assert self.component.ui_actions() == []

    def test_a_press_after_the_answer_is_sent_again(self):
        self.component.ui_action(ACTION_SELECTED)
        self.answer_first()

        self.component.ui_action(ACTION_SELECTED)

        assert len(self.sent) == 2

    def test_an_answer_never_starts_the_next_request_in_its_own_call(self):
        self.component.ui_action(ACTION_SELECTED)
        _, _, done = self.sent[0]

        done(True)

        assert len(self.later) == 1

    def test_another_account_drops_the_queue(self):
        self.component.ui_action(ACTION_SELECTED)

        self.app.bus.emit('account', 2)

        assert self.component.ui_actions() != []

    def test_a_late_answer_for_the_previous_account_touches_nothing(self):
        self.component.ui_action(ACTION_SELECTED)
        self.app.bus.emit('account', 2)
        self.component.ui_action(ACTION_SELECTED)

        self.answer_first()

        assert self.component.ui_actions() == []


if __name__ == '__main__':
    unittest.main()
