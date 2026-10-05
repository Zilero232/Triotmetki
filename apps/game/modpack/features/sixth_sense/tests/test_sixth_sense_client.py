from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support  # noqa: F401

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.sixth_sense.client')
OBSERVED_BY_ENEMY = 11


class Namespace(object):

    def __init__(self, **values):
        self.__dict__.update(values)


class Hooks(object):

    def __init__(self):
        self.handlers = {}

    def add(self, target, event, handler):
        self.handlers[event] = handler


class Ticker(object):

    def start(self):
        return None

    def stop(self):
        return None


def own_vehicle(spotted, alive=True):
    return Namespace(sixthSenseState=spotted, isAlive=lambda: alive)


def forget_client():
    for name in [name for name in sys.modules if name.startswith(CLIENT_PREFIXES)]:
        del sys.modules[name]


class StartSpottedTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        forget_client()
        sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
        self.module = importlib.import_module('otmetki.features.sixth_sense.client')
        self.vehicle = own_vehicle(False)
        self.module.vehicle_state = lambda: Namespace(getControllingVehicle=lambda: self.vehicle)
        self.module.controls_own_vehicle = lambda: True
        self.module.own_spotting_decrease = lambda: 0.0
        self.panel = self.module.SixthSenseAlert.__new__(self.module.SixthSenseAlert)
        self.panel.states = {OBSERVED_BY_ENEMY: 'observed'}
        self.panel.settings = {'hide_after_s': 0}
        self.panel.hooks = Hooks()
        self.panel.ticker = Ticker()
        self.panel.wait = lambda reason: None
        self.panel.hide = lambda: None
        self.panel.render = lambda: None

    def tearDown(self):
        forget_client()
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    def test_a_tank_already_spotted_when_the_panel_starts_lights_the_lamp(self):
        self.vehicle = own_vehicle(True)

        self.panel.start(Namespace())

        assert self.panel.lamp.lit

    def test_a_tank_not_spotted_when_the_panel_starts_keeps_the_lamp_off(self):
        self.panel.start(Namespace())

        assert not self.panel.lamp.lit

    def test_a_destroyed_tank_keeps_the_lamp_off(self):
        self.vehicle = own_vehicle(True, alive=False)

        self.panel.start(Namespace())

        assert not self.panel.lamp.lit

    def test_the_own_tank_spotted_when_it_is_ready_lights_the_lamp(self):
        self.vehicle = None
        self.panel.start(Namespace())

        self.panel.hooks.handlers['onVehicleControlling'](own_vehicle(True))

        assert self.panel.lamp.lit


if __name__ == '__main__':
    unittest.main()
