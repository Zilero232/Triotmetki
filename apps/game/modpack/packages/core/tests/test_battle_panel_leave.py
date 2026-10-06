from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

PREFIXES = ('otmetki.core.client',)
PANEL_ID = 'damage_log'


class Recorder(object):

    def __init__(self, steps):
        self.steps = steps

    def end(self):
        self.steps.append('preview')

    def clear(self):
        self.steps.append('hooks')

    def hide(self, panel_id):
        self.steps.append('hide')

    def renders_widgets(self):
        return True

    def want(self, panel_id, aliases, while_hidden=False):
        self.steps.append(('stock', tuple(aliases)))


class BattlePanelLeaveTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        _support.forget_modules(PREFIXES)
        big_world = types.ModuleType(str('BigWorld'))
        big_world.callback = lambda delay, fn: None
        sys.modules['BigWorld'] = big_world
        module = importlib.import_module('otmetki.core.client.hud.panel')
        self.steps = []
        self.panel = self.make_panel(module.BattlePanel)

    def tearDown(self):
        _support.forget_modules(PREFIXES)
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    def make_panel(self, base):
        def broken_stop(panel):
            raise RuntimeError('stop')

        panel_class = type(str('BrokenPanel'), (base,), {'stop': broken_stop})
        panel = panel_class.__new__(panel_class)
        recorder = Recorder(self.steps)
        panel.component_id = PANEL_ID
        panel.running = True
        panel.preview = recorder
        panel.hooks = recorder
        panel.hud = recorder
        panel.stock = recorder
        panel.enabled = lambda: True
        return panel

    def test_a_failing_stop_still_hides_the_panel(self):
        self.panel._on_leave()

        self.assertIn('hide', self.steps)

    def test_a_failing_stop_still_gives_the_stock_element_back(self):
        self.panel._on_leave()

        self.assertEqual(self.steps[-1], ('stock', ()))

    def test_a_failing_stop_leaves_the_panel_stopped(self):
        self.panel._on_leave()

        self.assertFalse(self.panel.running)


if __name__ == '__main__':
    unittest.main()
