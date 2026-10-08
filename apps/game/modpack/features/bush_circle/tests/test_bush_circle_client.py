from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.bush_circle.client')
OWN_ID = 3
RESPAWNED_ID = 30
ALLY_ID = 9


class Namespace(object):

    def __init__(self, **values):
        self.__dict__.update(values)


class Hooks(object):

    def __init__(self):
        self.handlers = {}

    def add(self, target, event, handler):
        self.handlers[event] = handler

    def clear(self):
        self.handlers = {}


class Hotkey(object):

    def __init__(self):
        self.key = None

    def set(self, key):
        self.key = key

    def remove(self):
        self.key = None


def forget_client():
    _support.forget_modules(CLIENT_PREFIXES)


class BushCircleClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        forget_client()
        sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
        module = importlib.import_module('otmetki.features.bush_circle.client')
        self.switch = [True]
        self.circle = module.BushCircle.__new__(module.BushCircle)
        self.circle.settings = {'mode': 'always', 'hotkey': 'ctrl_shift_c', 'color': 'white'}
        self.circle.enabled = lambda: self.switch[0]
        self.circle.state = None
        self.circle.model = None
        self.circle.owner = None
        self.circle.generation = 0
        self.circle.hooks = Hooks()
        self.circle.hotkey = Hotkey()
        self.applied = []
        self.circle.apply = lambda: self.applied.append(self.circle.vehicle_id)
        self.circle._on_battle_ready(Namespace(playerVehicleID=OWN_ID))

    def tearDown(self):
        forget_client()
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    def test_switching_off_in_battle_drops_the_circle(self):
        self.switch[0] = False

        self.circle.settings_changed(['battle_bush_circle'])

        assert self.circle.state is None

    def test_switching_off_in_battle_drops_the_battle_hooks(self):
        self.switch[0] = False

        self.circle.settings_changed(['battle_bush_circle'])

        assert self.circle.hooks.handlers == {}

    def test_a_respawned_own_tank_gets_the_circle_on_its_new_vehicle(self):
        self.circle.hooks.handlers['onVehicleKilled'](OWN_ID)

        self.circle.hooks.handlers['onVehicleControlling'](Namespace(id=RESPAWNED_ID, isPlayerVehicle=True))

        assert (self.circle.vehicle_id, self.circle.state.wanted()) == (RESPAWNED_ID, True)

    def test_the_ally_the_camera_follows_after_death_gets_no_circle(self):
        self.circle.hooks.handlers['onVehicleKilled'](OWN_ID)

        self.circle.hooks.handlers['onVehicleControlling'](Namespace(id=ALLY_ID, isPlayerVehicle=False))

        assert (self.circle.vehicle_id, self.circle.state.wanted()) == (OWN_ID, False)


if __name__ == '__main__':
    unittest.main()
