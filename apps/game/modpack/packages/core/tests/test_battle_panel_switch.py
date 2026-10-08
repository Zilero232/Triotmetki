from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

PREFIXES = ('otmetki.core.client',)
PANEL_ID = 'team_hp'
PLAYER = 'avatar'


class Layer(object):

    def __init__(self):
        self.allowed = True

    def allows(self, panel_id):
        return self.allowed

    def hide(self, panel_id):
        pass


class Stock(object):

    def want(self, panel_id, aliases, while_hidden=False):
        pass


class App(object):

    in_battle = True


class BattlePanelSwitchTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        _support.forget_modules(PREFIXES)
        big_world = types.ModuleType(str('BigWorld'))
        big_world.callback = lambda delay, fn: None
        sys.modules['BigWorld'] = big_world
        module = importlib.import_module('otmetki.core.client.hud.panel')
        self.started = []
        self.switch = [False]
        self.panel = self.make_panel(module.BattlePanel)

    def tearDown(self):
        _support.forget_modules(PREFIXES)
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    def make_panel(self, base):
        started = self.started

        def start(panel, *args):
            started.append(args)

        panel_class = type(str('SwitchedPanel'), (base,), {'start': start})
        panel = panel_class.__new__(panel_class)
        panel.component_id = PANEL_ID
        panel.app = App()
        panel.running = False
        panel.start_args = (PLAYER,)
        panel.hud = Layer()
        panel.stock = Stock()
        panel.enabled = lambda: self.switch[0]
        panel.settings_changed = lambda changed: None
        return panel

    def test_a_panel_switched_on_mid_battle_starts(self):
        self.switch[0] = True

        self.panel._on_component_settings(PANEL_ID, ['enabled'])

        self.assertEqual(self.started, [(PLAYER,)])

    def test_a_panel_switched_on_mid_battle_runs(self):
        self.switch[0] = True

        self.panel._on_component_settings(PANEL_ID, ['enabled'])

        self.assertTrue(self.panel.running)

    def test_a_panel_the_battle_type_leaves_out_stays_off(self):
        self.switch[0] = True
        self.panel.hud.allowed = False

        self.panel._on_component_settings(PANEL_ID, ['enabled'])

        self.assertEqual(self.started, [])

    def test_a_panel_switched_on_before_its_battle_started_waits_for_it(self):
        self.switch[0] = True
        self.panel.start_args = None

        self.panel._on_component_settings(PANEL_ID, ['enabled'])

        self.assertEqual(self.started, [])

    def test_a_panel_switched_on_in_the_hangar_waits_for_the_battle(self):
        self.switch[0] = True
        self.panel.app.in_battle = False

        self.panel._on_component_settings(PANEL_ID, ['enabled'])

        self.assertEqual(self.started, [])

    def test_a_change_of_another_component_starts_nothing(self):
        self.switch[0] = True

        self.panel._on_component_settings('damage_log', ['enabled'])

        self.assertEqual(self.started, [])


if __name__ == '__main__':
    unittest.main()
