# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

CLIENT_PREFIX = 'otmetki.core.client'
STUBBED = ('BigWorld', 'Vehicle')
ENEMY = 7
OWN = 3
ALLY = 9
POINTS = [0x1234]
EXPLOSION_METHOD = 'showDamageFromExplosion'


def vehicle_class(with_explosion=True):
    """The client's Vehicle entity class (RU 1.45 Vehicle.py), with the two hit effect methods it draws."""

    class Vehicle(object):

        def __init__(self, own, entity_id=OWN):
            self.isPlayerVehicle = own
            self.id = entity_id
            self.drawn = []

        def showDamageFromShot(self, attacker_id, points, effects_index, damage_factor, last_material_is_shield):
            self.drawn.append(('shot', attacker_id))
            return 'shot drawn'

    if with_explosion:
        def show_damage_from_explosion(self, attacker_id, center, effects_index, damage_factor):
            self.drawn.append(('explosion', attacker_id))

        Vehicle.showDamageFromExplosion = show_damage_from_explosion
    return Vehicle


class Avatar(object):

    playerVehicleID = OWN


def load_own_vehicle(vehicle):
    """core.client.battle on a stubbed client whose Vehicle module holds `vehicle`."""
    sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
    sys.modules['BigWorld'].player = Avatar
    sys.modules['Vehicle'] = types.ModuleType(str('Vehicle'))
    sys.modules['Vehicle'].Vehicle = vehicle
    try:
        return importlib.import_module('otmetki.core.client.battle')
    finally:
        _support.forget_modules(CLIENT_PREFIX)


def restore(saved):
    for name, module in saved.items():
        if module is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = module


class OwnShotTest(unittest.TestCase):

    def setUp(self):
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED)
        self.vehicle = vehicle_class()
        self.battle = load_own_vehicle(self.vehicle)
        self.shots = []

    def tearDown(self):
        restore(self.saved)

    def hook_shots(self):
        return self.battle.on_own_shot(lambda attacker_id, points: self.shots.append((attacker_id, points)))

    def test_a_shot_on_the_own_vehicle_reaches_the_callback(self):
        self.hook_shots()

        self.vehicle(True).showDamageFromShot(ENEMY, POINTS, 0, 1.0, False)

        assert self.shots == [(ENEMY, POINTS)]

    def test_a_shot_on_another_vehicle_is_never_seen(self):
        self.hook_shots()

        self.vehicle(False).showDamageFromShot(ENEMY, POINTS, 0, 1.0, False)

        assert self.shots == []

    def test_the_client_still_draws_the_shot(self):
        self.hook_shots()
        own = self.vehicle(True)

        result = own.showDamageFromShot(ENEMY, POINTS, 0, 1.0, False)

        assert result == 'shot drawn'
        assert own.drawn == [('shot', ENEMY)]

    def test_hooking_reports_success(self):
        assert self.hook_shots()


class ShotWithOwnVehicleTest(unittest.TestCase):

    def setUp(self):
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED)
        self.vehicle = vehicle_class()
        self.battle = load_own_vehicle(self.vehicle)
        self.shots = []
        self.battle.on_shot_with_own_vehicle(lambda *args: self.shots.append((args[0].id,) + args[1:]))

    def tearDown(self):
        restore(self.saved)

    def test_a_shot_on_the_own_vehicle_reaches_the_callback(self):
        self.vehicle(True).showDamageFromShot(ENEMY, POINTS, 4, 1.0, False)

        assert self.shots == [(OWN, ENEMY, POINTS, 4)]

    def test_an_own_shot_on_another_vehicle_reaches_the_callback(self):
        self.vehicle(False, ENEMY).showDamageFromShot(OWN, POINTS, 4, 1.0, False)

        assert self.shots == [(ENEMY, OWN, POINTS, 4)]

    def test_a_shot_between_two_other_vehicles_is_never_seen(self):
        self.vehicle(False, ENEMY).showDamageFromShot(ALLY, POINTS, 4, 1.0, False)

        assert self.shots == []


class OwnVehicleEffectTest(unittest.TestCase):

    def setUp(self):
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED)
        self.effects = []

    def tearDown(self):
        restore(self.saved)

    def test_a_splash_on_the_own_vehicle_reaches_the_callback_with_its_details(self):
        vehicle = vehicle_class()
        battle = load_own_vehicle(vehicle)
        battle.on_own_vehicle_effect(EXPLOSION_METHOD, lambda *args: self.effects.append(args))

        vehicle(True).showDamageFromExplosion(ENEMY, (1, 2, 3), 0, 1.0)

        assert self.effects == [(ENEMY, (1, 2, 3), 0, 1.0)]

    def test_a_method_the_client_lacks_is_not_hooked(self):
        battle = load_own_vehicle(vehicle_class(with_explosion=False))

        hooked = battle.on_own_vehicle_effect(EXPLOSION_METHOD, self.effects.append)

        assert not hooked

    def test_a_client_without_the_vehicle_module_is_not_hooked(self):
        battle = load_own_vehicle(None)

        hooked = battle.on_own_shot(self.effects.append)

        assert not hooked


if __name__ == '__main__':
    unittest.main()
