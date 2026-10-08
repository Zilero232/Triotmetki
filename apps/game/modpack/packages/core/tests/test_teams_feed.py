# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import sys
import types
import unittest

import _support

STUBBED = ('BigWorld', 'gui', 'gui.battle_control', 'gui.battle_control.battle_constants', 'gui.Scaleform',
           'gui.Scaleform.daapi', 'gui.Scaleform.daapi.view', 'gui.Scaleform.daapi.view.battle',
           'gui.Scaleform.daapi.view.battle.shared', 'gui.Scaleform.daapi.view.battle.shared.page')
BATTLE_FIELD_CTRL = 33
RULE_NONE = 0


class Namespace(object):

    def __init__(self, **values):
        self.__dict__.update(values)


class SessionProvider(object):

    def __init__(self, battle_field=True):
        self.dynamic = Namespace(battleField=object() if battle_field else None)
        self.registered = []
        self.added = []
        self.arena = ArenaDP()

    def registerViewComponents(self, *data):
        self.registered.append(data)
        return True

    def addViewComponent(self, alias, component, rule=1):
        self.added.append((alias, component, rule))

    def getArenaDP(self):
        return self.arena


class SharedPage(object):

    def __init__(self, provider):
        self.sessionProvider = provider
        self.calls = []

    def _startBattleSession(self):
        self.calls.append('start')

    def _stopBattleSession(self):
        self.calls.append('stop')


class VehicleInfo(object):

    def __init__(self, vehicle_id, team, max_health, level):
        self.vehicleID = vehicle_id
        self.team = team
        self.vehicleType = Namespace(maxHealth=max_health, classTag='mediumTank', level=level)

    def isAlive(self):
        return True


class ArenaDP(object):

    def getVehiclesInfoIterator(self):
        return iter([VehicleInfo(1, 1, 1000, 8), VehicleInfo(2, 2, 1200, 8), VehicleInfo(3, 2, 900, 7)])


class Hooks(object):

    def __init__(self):
        self.handlers = {}

    def add(self, resolve, name, handler):
        self.handlers[name] = handler


def refuse_a_second_linkage(*data):
    raise ValueError('Linkage of controller ID to view alias have to be defined only once!')


def install_stubs(provider):
    saved = {name: sys.modules.get(name) for name in STUBBED}
    for name in STUBBED:
        sys.modules[name] = types.ModuleType(str(name))
    sys.modules['BigWorld'].player = lambda: Namespace(team=1, guiSessionProvider=provider)
    constants = sys.modules['gui.battle_control.battle_constants']
    constants.BATTLE_CTRL_ID = Namespace(BATTLE_FIELD_CTRL=BATTLE_FIELD_CTRL)
    constants.VIEW_COMPONENT_RULE = Namespace(NONE=RULE_NONE, PROXY=1)
    constants.FEEDBACK_EVENT_ID = Namespace(VEHICLE_HEALTH=1, VEHICLE_DEAD=2)
    constants.VEHICLE_VIEW_STATE = Namespace(HEALTH=4)
    sys.modules['gui.Scaleform.daapi.view.battle.shared.page'].SharedPage = SharedPage
    return saved


def restore_stubs(saved):
    for name, module in saved.items():
        if module is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = module
    _support.forget_modules('otmetki.core.client.battle')


class BattleFieldFeedTest(unittest.TestCase):

    def setUp(self):
        self.provider = SessionProvider()
        self.saved = install_stubs(self.provider)
        hooked = ('_startBattleSession', '_stopBattleSession')
        self.originals = {name: SharedPage.__dict__[name] for name in hooked}
        from otmetki.core.client.battle.teams import TeamTracker
        from otmetki.core.client.battle.teams.feed import battle_field_feed
        self.feed = battle_field_feed()
        self.redraws = []
        self.tracker = TeamTracker(lambda: self.redraws.append(True))

    def tearDown(self):
        for name, value in self.originals.items():
            setattr(SharedPage, name, value)
        restore_stubs(self.saved)

    def test_links_to_the_battle_field_controller_after_the_page_links_its_own(self):
        page = SharedPage(self.provider)

        page._startBattleSession()

        assert page.calls == ['start']
        assert self.provider.registered == [((BATTLE_FIELD_CTRL, ('otmetkiTeamHealth',)),)]
        assert self.provider.added == [('otmetkiTeamHealth', self.feed, RULE_NONE)]

    def test_stays_unlinked_where_the_battle_has_no_battle_field_controller(self):
        provider = SessionProvider(battle_field=False)

        SharedPage(provider)._startBattleSession()

        assert provider.added == []

    def test_a_page_reload_links_again_though_the_bridge_already_knows_the_alias(self):
        page = SharedPage(self.provider)
        page._startBattleSession()
        self.provider.registerViewComponents = refuse_a_second_linkage

        page._startBattleSession()

        assert len(self.provider.added) == 2

    def test_the_stock_totals_reach_a_running_tracker(self):
        self.tracker.start(Hooks(), Namespace(team=1))

        self.feed.updateTeamHealth(800, 1500, 1000, 2100)

        assert self.tracker.teams.health(False) == {'hp': 1500, 'max': 2100}
        assert self.redraws

    def test_vehicle_health_and_deaths_reach_a_running_tracker(self):
        self.tracker.start(Hooks(), Namespace(team=1))

        self.feed.updateVehicleHealth(2, 700, 1200)
        self.feed.updateDeadVehicles({1, 2}, set(), {2}, {3})

        assert self.tracker.teams.vehicles[2]['hp'] == 700
        assert self.tracker.teams.vehicles[3]['alive'] is False

    def test_a_tracker_started_late_gets_the_numbers_so_far(self):
        self.feed.updateTeamHealth(800, 1500, 1000, 2100)

        self.tracker.start(Hooks(), Namespace(team=1))

        assert self.tracker.teams.health(True) == {'hp': 800, 'max': 1000}

    def test_a_stopped_tracker_hears_nothing(self):
        self.tracker.start(Hooks(), Namespace(team=1))
        self.tracker.stop()
        self.redraws[:] = []

        self.feed.updateTeamHealth(800, 1500, 1000, 2100)

        assert self.redraws == []

    def test_the_battle_end_forgets_the_numbers(self):
        page = SharedPage(self.provider)
        self.feed.updateTeamHealth(800, 1500, 1000, 2100)

        page._stopBattleSession()

        assert self.feed.team_health is None

    def test_tiers_come_from_the_arena_data(self):
        self.tracker.start(Hooks(), Namespace(team=1))

        enemies = self.tracker.teams.team(False)

        assert [vehicle['level'] for vehicle in enemies] == [8, 7]

    def test_a_respawn_reads_the_arena_again(self):
        hooks = Hooks()
        self.tracker.start(hooks, Namespace(team=1))
        self.tracker.teams.kill(2)

        hooks.handlers['onVehicleRecovered'](2)

        assert self.tracker.teams.vehicles[2]['hp'] == 1200

    def test_a_vehicle_update_reads_the_arena_again(self):
        hooks = Hooks()
        self.tracker.start(hooks, Namespace(team=1))
        self.tracker.teams.kill(2)

        hooks.handlers['onVehicleUpdated'](2)

        assert self.tracker.teams.vehicles[2]['alive'] is True


if __name__ == '__main__':
    unittest.main()
