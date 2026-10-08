from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

STUBBED = ('BigWorld', 'BattleFeedbackCommon')
CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.platoon_points.client')
OWN_ID = 3
MATE_ID = 4
ENEMY_ID = 9


class Namespace(object):

    def __init__(self, **values):
        self.__dict__.update(values)


class Hooks(object):

    def __init__(self):
        self.handlers = {}

    def add(self, target, event, handler):
        self.handlers[event] = handler


class ArenaData(object):

    def __init__(self):
        self.infos = [Namespace(vehicleID=OWN_ID)]
        self.scans = 0

    def getVehiclesInfoIterator(self):
        self.scans += 1
        return list(self.infos)

    def getVehicleInfo(self, vehicle_id):
        found = [info for info in self.infos if info.vehicleID == vehicle_id]
        return found[0] if found else None

    def isSquadMan(self, vehicle_id):
        return vehicle_id == MATE_ID


def forget_client():
    _support.forget_modules(CLIENT_PREFIXES)


def stub_client():
    for name in STUBBED:
        sys.modules[name] = types.ModuleType(str(name))
    sys.modules['BattleFeedbackCommon'].BATTLE_EVENT_TYPE = type(str('BATTLE_EVENT_TYPE'), (object,), {})


class LateArenaEntryTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        forget_client()
        stub_client()
        module = importlib.import_module('otmetki.features.platoon_points.client')
        self.arena_data = ArenaData()
        module.arena_dp = lambda: self.arena_data
        self.panel = module.PlatoonPointsPanel.__new__(module.PlatoonPointsPanel)
        self.panel.hooks = Hooks()
        self.renders = []
        self.panel.render = lambda: self.renders.append(1)
        self.panel.start(Namespace(playerVehicleID=OWN_ID))
        self.arena_data.scans = 0
        del self.renders[:]

    def tearDown(self):
        forget_client()
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def test_a_platoon_mate_added_to_the_arena_later_joins_the_platoon(self):
        self.arena_data.infos.append(Namespace(vehicleID=MATE_ID))

        self.panel.hooks.handlers['onVehicleAdded'](MATE_ID)

        assert sorted(self.panel.platoon.members) == [OWN_ID, MATE_ID]

    def test_an_updated_arena_entry_joins_the_platoon(self):
        self.arena_data.infos.append(Namespace(vehicleID=MATE_ID))

        self.panel.hooks.handlers['onVehicleUpdated'](MATE_ID)

        assert sorted(self.panel.platoon.members) == [OWN_ID, MATE_ID]

    def test_an_update_of_another_vehicle_scans_nothing(self):
        self.arena_data.infos.append(Namespace(vehicleID=ENEMY_ID))

        self.panel.hooks.handlers['onVehicleUpdated'](ENEMY_ID)

        assert self.arena_data.scans == 0

    def test_an_update_of_another_vehicle_renders_nothing(self):
        self.arena_data.infos.append(Namespace(vehicleID=ENEMY_ID))

        self.panel.hooks.handlers['onVehicleUpdated'](ENEMY_ID)

        assert self.renders == []

    def test_a_recovered_platoon_mate_is_read_again(self):
        self.arena_data.infos.append(Namespace(vehicleID=MATE_ID))

        self.panel.hooks.handlers['onVehicleRecovered'](MATE_ID)

        assert sorted(self.panel.platoon.members) == [OWN_ID, MATE_ID]


if __name__ == '__main__':
    unittest.main()
