# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support  # noqa: F401
from otmetki.core.events import EventBus
from otmetki.core.storage import MemoryFile

STUBBED = ('BigWorld', 'Vehicle', 'BattleFeedbackCommon', 'items', 'items.vehicles')
CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.hit_viewer.client')
OWN_ID = 3
ENEMY_ID = 7
ALLY_ID = 9
HULL_PEN = 4 | (1 << 8) | (120 << 16) | (100 << 24) | (250 << 32) | (130 << 40) | (110 << 48) | (255 << 56)
EFFECTS = {0: {'shellType': 'ARMOR_PIERCING', 'caliber': 128.0}}
DAMAGE, RECEIVED_DAMAGE = 7, 10


class Namespace(object):

    def __init__(self, **values):
        self.__dict__.update(values)


class Avatar(object):

    playerVehicleID = OWN_ID
    arenaUniqueID = 555
    arena = None


class Part(object):

    def __init__(self, compact_descr):
        self.compactDescr = compact_descr


class Descriptor(object):

    def __init__(self, type_cd):
        self.type = Part(type_cd)
        self.chassis, self.turret, self.gun = Part(type_cd + 1), Part(type_cd + 2), Part(type_cd + 3)


class Vehicle(object):

    def __init__(self, entity_id, own=False):
        self.id = entity_id
        self.isPlayerVehicle = own
        self.typeDescriptor = Descriptor(entity_id * 100)

    def showDamageFromShot(self, attacker_id, points, effects_index, damage_factor, last_material_is_shield):
        return None


class Extra(object):

    def __init__(self, damage):
        self.damage = damage

    def isShot(self):
        return True

    def getDamage(self):
        return self.damage


class FeedbackEvent(object):

    def __init__(self, kind, target_id, damage):
        self.kind, self.target_id, self.extra = kind, target_id, Extra(damage)

    def getBattleEventType(self):
        return self.kind

    def getTargetID(self):
        return self.target_id

    def getExtra(self):
        return self.extra


class Component(object):

    def __init__(self):
        self.app = Namespace(bus=EventBus(), account_id=None)
        self.settings = {'keep_battles': 20, 'record_received': True, 'record_dealt': True}
        self.store = MemoryFile()

    def enabled(self):
        return True

    def follow_account(self, on_account):
        on_account(1)

    def account_file(self, pattern, account_id):
        return self.store


def stub_client():
    big_world = types.ModuleType(str('BigWorld'))
    big_world.player = Avatar
    vehicle_module = types.ModuleType(str('Vehicle'))
    vehicle_module.Vehicle = Vehicle
    feedback_common = types.ModuleType(str('BattleFeedbackCommon'))
    feedback_common.BATTLE_EVENT_TYPE = type(str('BATTLE_EVENT_TYPE'), (object,), {
        'DAMAGE': DAMAGE, 'RECEIVED_DAMAGE': RECEIVED_DAMAGE,
    })
    items = types.ModuleType(str('items'))
    vehicles = types.ModuleType(str('items.vehicles'))
    vehicles.g_cache = Namespace(shotEffects=EFFECTS)
    items.vehicles = vehicles
    for name, module in zip(STUBBED, (big_world, vehicle_module, feedback_common, items, vehicles)):
        sys.modules[name] = module


def forget_client():
    for name in [name for name in sys.modules if name.startswith(CLIENT_PREFIXES)]:
        del sys.modules[name]


class RecorderTest(unittest.TestCase):

    def setUp(self):
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED)
        forget_client()
        stub_client()
        recorder_module = importlib.import_module('otmetki.features.hit_viewer.client.recorder')
        self.component = Component()
        self.recorder = recorder_module.HitRecorder(self.component)
        self.recorder.hooks.add = lambda *args: None
        self.recorder._on_battle_ready(Avatar())

    def tearDown(self):
        forget_client()
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def finish(self):
        self.component.app.bus.emit('battle_leave')
        return self.recorder.battles()[-1]

    def test_a_hit_on_the_own_tank_is_recorded_as_received(self):
        Vehicle(OWN_ID, own=True).showDamageFromShot(ENEMY_ID, [HULL_PEN], 0, 1.0, False)

        assert self.finish()['hits'][0]['side'] == 'received'

    def test_an_own_hit_on_an_enemy_is_recorded_as_dealt(self):
        Vehicle(ENEMY_ID).showDamageFromShot(OWN_ID, [HULL_PEN], 0, 1.0, False)

        assert self.finish()['hits'][0]['side'] == 'dealt'

    def test_a_shot_between_two_other_vehicles_is_not_recorded(self):
        Vehicle(ENEMY_ID).showDamageFromShot(ALLY_ID, [HULL_PEN], 0, 1.0, False)
        self.component.app.bus.emit('battle_leave')

        assert self.recorder.battles() == []

    def test_the_shell_comes_from_the_shot_effects(self):
        Vehicle(OWN_ID, own=True).showDamageFromShot(ENEMY_ID, [HULL_PEN], 0, 1.0, False)

        assert self.finish()['hits'][0]['shell'] == 'ap'

    def test_the_target_keeps_only_the_model_modules(self):
        Vehicle(ENEMY_ID).showDamageFromShot(OWN_ID, [HULL_PEN], 0, 1.0, False)

        assert sorted(self.finish()['targets'][u'7']) == ['cd', 'chassis', 'class', 'gun', 'name', 'turret']

    def test_the_own_feedback_damage_reaches_the_dealt_hit(self):
        Vehicle(ENEMY_ID).showDamageFromShot(OWN_ID, [HULL_PEN], 0, 1.0, False)

        self.recorder._on_feedback([FeedbackEvent(DAMAGE, ENEMY_ID, 420)])

        assert self.finish()['hits'][0]['damage'] == 420

    def test_a_switched_off_side_is_not_recorded(self):
        self.component.settings['record_dealt'] = False

        Vehicle(ENEMY_ID).showDamageFromShot(OWN_ID, [HULL_PEN], 0, 1.0, False)
        self.component.app.bus.emit('battle_leave')

        assert self.recorder.battles() == []


if __name__ == '__main__':
    unittest.main()
