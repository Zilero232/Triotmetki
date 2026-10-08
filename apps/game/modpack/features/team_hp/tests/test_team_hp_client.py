from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.team_hp.client')


class TeamHpRenderTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        _support.forget_modules(CLIENT_PREFIXES)
        self.callbacks = []
        big_world = types.ModuleType(str('BigWorld'))
        big_world.callback = self.schedule
        sys.modules['BigWorld'] = big_world
        module = importlib.import_module('otmetki.features.team_hp.client')
        self.renders = []
        self.panel = module.TeamHpPanel.__new__(module.TeamHpPanel)
        self.panel.is_render_pending = False
        self.panel.render = self.record_render

    def tearDown(self):
        _support.forget_modules(CLIENT_PREFIXES)
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    def schedule(self, delay, callback):
        self.callbacks.append(callback)

    def record_render(self):
        self.renders.append(True)

    def run_frame(self):
        callbacks = self.callbacks
        self.callbacks = []
        for callback in callbacks:
            callback()

    def test_several_team_updates_in_a_frame_render_once(self):
        self.panel._request_render()
        self.panel._request_render()

        self.run_frame()

        self.assertEqual(len(self.renders), 1)

    def test_the_render_waits_for_the_next_frame(self):
        self.panel._request_render()

        self.assertEqual(self.renders, [])

    def test_an_update_after_the_frame_renders_again(self):
        self.panel._request_render()
        self.run_frame()
        self.panel._request_render()

        self.run_frame()

        self.assertEqual(len(self.renders), 2)


if __name__ == '__main__':
    unittest.main()
