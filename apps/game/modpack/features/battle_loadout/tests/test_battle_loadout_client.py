from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support  # noqa: F401

STUBBED = ('BigWorld',)
CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.battle_loadout.client')


class Layer(object):
    """The HUD layer the panel draws on: what it was asked to show and to take off."""

    def __init__(self):
        self.calls = []

    def show(self, panel_id, text, widget=None):
        self.calls.append(('show', panel_id))
        return True

    def hide(self, panel_id):
        self.calls.append(('hide', panel_id))


def stub_client():
    big_world = types.ModuleType(str('BigWorld'))
    big_world.callback = lambda delay, callback: None
    sys.modules['BigWorld'] = big_world


def forget_client():
    for name in [name for name in sys.modules if name.startswith(CLIENT_PREFIXES)]:
        del sys.modules[name]


def device():
    return {'name': u'Rammer', 'effect': u'', 'icon': None, 'overlay': None, 'kind': 'device', 'empty': False,
            'bonus': False, 'attention': False}


class SettingsChangedTest(unittest.TestCase):

    def setUp(self):
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED)
        forget_client()
        stub_client()
        client = importlib.import_module('otmetki.features.battle_loadout.client')
        panel = client.BattleLoadoutPanel.__new__(client.BattleLoadoutPanel)
        panel.hud = Layer()
        panel.stock = None
        panel.component_id = 'battle_loadout'
        panel.settings = {'stock_size': True, 'icon_size': 40}
        panel.devices = []
        panel.running = False
        panel.sync_stock = lambda: None
        self.panel = panel

    def tearDown(self):
        forget_client()
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    # The HUD edit mode's preview of the panel is on the same layer: a drag or a reset in the hangar changes the
    # settings, and the panel must not take that preview off.
    def test_a_settings_change_in_the_hangar_leaves_the_hud_edit_preview(self):
        self.panel.settings_changed(['x', 'y'])

        assert self.panel.hud.calls == []

    def test_a_settings_change_in_battle_draws_the_row_again(self):
        self.panel.running = True
        self.panel.devices = [device()]

        self.panel.settings_changed(['pinned'])

        assert self.panel.hud.calls == [('show', 'battle_loadout')]


if __name__ == '__main__':
    unittest.main()
