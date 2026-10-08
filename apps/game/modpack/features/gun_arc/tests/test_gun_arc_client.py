from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.gun_arc.model.constants import FAST_TICK_S
from otmetki.features.gun_arc.settings import SCHEMA

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.gun_arc.client')
OWN_VEHICLE = 7
LIMITS = (-0.2, 0.5)


class Namespace(object):

    def __init__(self, **attrs):
        self.__dict__.update(attrs)


class Ticker(object):

    def __init__(self):
        self.started = 0
        self.interval_s = None

    def start(self):
        self.started += 1


def battle_player(limits):
    gun = Namespace(turretYawLimits=limits)
    return Namespace(playerVehicleID=OWN_VEHICLE, vehicleTypeDescriptor=Namespace(gun=gun))


class GunArcPanelTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        _support.forget_modules(CLIENT_PREFIXES)
        big_world = types.ModuleType(str('BigWorld'))
        big_world.callback = lambda delay, fn: None
        big_world.player = lambda: self.player
        sys.modules['BigWorld'] = big_world
        self.player = battle_player(LIMITS)
        module = importlib.import_module('otmetki.features.gun_arc.client')
        self.shown = []
        self.panel = self.make_panel(module.GunArcPanel)

    def tearDown(self):
        _support.forget_modules(CLIENT_PREFIXES)
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    def make_panel(self, panel_class):
        panel = panel_class.__new__(panel_class)
        panel.settings = Settings({}, SCHEMA)
        panel.drawn = None
        panel.has_panel = True
        panel.limits = LIMITS
        panel.ticker = Ticker()
        panel.show = self.record_show
        panel.wait = lambda reason: None
        return panel

    def record_show(self, text, widget=None):
        self.shown.append(widget)
        return True

    def markers_of(self, index):
        data = self.shown[index]['data']
        return data['left'], data['right'], data['centre']

    def test_taking_the_markers_off_keeps_the_panel_on_the_page(self):
        self.panel._take_off()

        self.assertEqual(self.markers_of(0), (None, None, None))

    def test_taking_the_markers_off_twice_sends_one_empty_panel(self):
        self.panel._take_off()
        self.panel._take_off()

        self.assertEqual(len(self.shown), 1)

    def test_nothing_is_sent_before_the_markers_were_ever_drawn(self):
        self.panel.has_panel = False

        self.panel._take_off()

        self.assertEqual(self.shown, [])

    def test_the_own_new_vehicle_is_read_again(self):
        self.player = battle_player(None)

        self.panel._on_vehicle_controlling(Namespace(id=OWN_VEHICLE))

        self.assertIsNone(self.panel.limits)

    def test_a_teammate_the_camera_follows_keeps_the_own_limits(self):
        self.player = battle_player(None)

        self.panel._on_vehicle_controlling(Namespace(id=OWN_VEHICLE + 1))

        self.assertEqual(self.panel.limits, LIMITS)

    def test_a_new_vehicle_with_limits_starts_the_markers(self):
        self.panel.limits = None

        self.panel._on_vehicle_controlling(Namespace(id=OWN_VEHICLE))

        self.assertEqual(self.panel.ticker.started, 1)

    def test_the_fast_redraw_is_thirty_times_a_second(self):
        self.assertEqual(round(1 / FAST_TICK_S), 30)


if __name__ == '__main__':
    unittest.main()
