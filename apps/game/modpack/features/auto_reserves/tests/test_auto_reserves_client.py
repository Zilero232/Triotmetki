from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import shutil
import sys
import tempfile
import types
import unittest

import _support
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig
from _support import MemoryFile
from otmetki.features.auto_reserves.i18n import STRINGS

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.auto_reserves.client')
STUBBED = ('BigWorld',)
CREDITS = {'id': 7, 'kind': 'credits', 'active': False, 'ready': True, 'value': 50, 'expires': 0}
XP = {'id': 8, 'kind': 'xp', 'active': False, 'ready': True, 'value': 100, 'expires': 0}


class Config(object):

    def __init__(self):
        self.values = {'hangar_auto_reserves': True}

    def is_enabled(self, switch):
        return bool(self.values.get(switch))

    def get(self, key):
        return self.values.get(key)

    def update(self, values):
        self.values.update(values)
        return sorted(values)


class Ui(object):

    def __init__(self):
        self.notes = []

    def notify(self, text):
        self.notes.append(text)


class App(object):

    def __init__(self, config_dir):
        self.config_dir = config_dir
        self.bus = EventBus()
        self.translate = _support.translator(STRINGS, 'en')
        self.config = Config()
        self.ui = Ui()
        self.in_battle = False
        self.account_id = 1
        self.saves = 0

    def save_config(self):
        self.saves += 1


class AutoReservesClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
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
        self.config_dir = tempfile.mkdtemp()
        self.app = App(self.config_dir)
        self.module = module
        self.component = module.AutoReserves(self.app)
        config.update('auto_reserves', {'reserve_credits': True})

    def tearDown(self):
        shutil.rmtree(self.config_dir)
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

    def log_in(self, account_id):
        self.app.account_id = account_id
        self.app.bus.emit('account', account_id)

    def turn_switch(self, is_on):
        self.app.config.values['hangar_auto_reserves'] = is_on
        self.app.bus.emit('component_settings', 'auto_reserves', ['hangar_auto_reserves'])

    def test_another_opted_in_account_gets_its_own_first_hangar(self):
        self.app.bus.emit('hangar')
        self.answer(True)
        self.log_in(2)
        self.turn_switch(True)

        self.app.bus.emit('hangar')

        assert len(self.sent) == 1

    def test_a_reserve_refused_on_one_account_is_tried_on_another(self):
        self.app.bus.emit('hangar')
        self.answer(False)
        self.log_in(2)
        self.turn_switch(True)

        self.app.bus.emit('hangar')

        assert len(self.sent) == 1

    def test_an_account_that_never_opted_in_activates_nothing(self):
        self.log_in(2)

        self.app.bus.emit('hangar')

        assert self.sent == []

    def test_the_switch_shows_the_choice_of_the_account_logged_in(self):
        self.log_in(2)

        assert self.app.config.values['hangar_auto_reserves'] is False

    def test_the_switch_that_was_on_counts_only_for_the_first_account(self):
        self.log_in(2)
        self.log_in(1)

        assert self.app.config.values['hangar_auto_reserves'] is True

    def test_the_choice_of_an_account_survives_a_restart(self):
        self.log_in(2)
        self.turn_switch(True)

        restarted = self.module.AutoReserves(App(self.config_dir))

        assert restarted.opt_ins['accounts'] == [1, 2]

    def test_turning_the_switch_off_drops_only_the_current_account(self):
        self.log_in(2)
        self.turn_switch(True)

        self.turn_switch(False)

        assert self.component.opt_ins['accounts'] == [1]

    def test_activate_now_asks_for_confirmation(self):
        actions = self.component.ui_actions()

        assert actions[0]['confirm'] == STRINGS['en']['auto_reserves_activate_confirm']

    def test_a_refused_reserve_is_tried_again_when_a_slot_frees(self):
        self.reserves = [dict(CREDITS), dict(XP, active=True), dict(XP, id=9, active=True)]
        self.app.bus.emit('hangar')
        self.answer(False)
        self.reserves = [dict(CREDITS), dict(XP, active=True)]

        self.app.bus.emit('tick', 1000.0)

        assert len(self.sent) == 1

    def test_a_refused_reserve_waits_while_no_slot_frees(self):
        self.reserves = [dict(CREDITS), dict(XP, active=True)]
        self.app.bus.emit('hangar')
        self.answer(False)

        self.app.bus.emit('tick', 1000.0)

        assert self.sent == []


if __name__ == '__main__':
    unittest.main()
