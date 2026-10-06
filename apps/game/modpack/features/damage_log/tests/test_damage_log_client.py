from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

STUBBED = ('BigWorld', 'BattleFeedbackCommon')
CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.damage_log.client')
ENEMY_ID = 7
ALLY_ID = 9
RICOCHET = 1 | (1 << 8) | (0x10 << 16) | (0x20 << 40)


class Received(object):

    def __init__(self):
        self.hits = []

    def ricochet(self, hit):
        self.hits.append(hit)
        return True


class Log(object):

    def __init__(self):
        self.received = Received()


def forget_client():
    _support.forget_modules(CLIENT_PREFIXES)


def stub_client():
    for name in STUBBED:
        sys.modules[name] = types.ModuleType(str(name))
    sys.modules['BattleFeedbackCommon'].BATTLE_EVENT_TYPE = type(str('BATTLE_EVENT_TYPE'), (object,), {})


class OwnShotTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        forget_client()
        stub_client()
        self.module = importlib.import_module('otmetki.features.damage_log.client')
        self.module.vehicle_name = lambda vehicle_id: 'T-34'
        self.module.vehicle_class = lambda vehicle_id: 'mediumTank'
        self.module.is_enemy = lambda vehicle_id: vehicle_id == ENEMY_ID
        self.module.controls_own_vehicle = lambda: True
        self.panel = self.module.DamageLogPanel.__new__(self.module.DamageLogPanel)
        self.panel.log = Log()
        self.panel.render = lambda: None

    def tearDown(self):
        forget_client()
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def test_an_enemy_ricochet_on_the_own_tank_is_logged(self):
        self.panel.on_own_shot(ENEMY_ID, [RICOCHET])

        assert len(self.panel.log.received.hits) == 1

    def test_an_ally_ricochet_is_not_logged(self):
        self.panel.on_own_shot(ALLY_ID, [RICOCHET])

        assert self.panel.log.received.hits == []

    def test_a_ricochet_on_the_tank_the_camera_follows_after_death_is_not_logged(self):
        self.module.controls_own_vehicle = lambda: False

        self.panel.on_own_shot(ENEMY_ID, [RICOCHET])

        assert self.panel.log.received.hits == []


if __name__ == '__main__':
    unittest.main()
