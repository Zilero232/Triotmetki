# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _feedback
import _support
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig
from _support import MemoryFile
from otmetki.features.auto_messages.i18n import STRINGS

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.auto_messages.client')
STATES_MODULE = 'gui.battle_control.battle_constants'
STUBBED = ('BigWorld', 'BattleFeedbackCommon', 'constants', 'PlayerEvents', STATES_MODULE)
BATTLE_PERIOD = 3
OWN_ID = 1
OWN_TEAM = 1
ARTY_ID = 7
ALLY_ID = 9
STATES = {'FIRE': 1, 'DEVICES': 2, 'HEALTH': 4, 'OBSERVED_BY_ENEMY': 4096}


class Event(object):

    def __init__(self):
        self.handlers = []

    def __iadd__(self, handler):
        self.handlers.append(handler)
        return self

    def __isub__(self, handler):
        self.handlers.remove(handler)
        return self


class Arena(object):

    def __init__(self):
        self.period = BATTLE_PERIOD
        self.onPeriodChange = Event()
        self.onVehicleKilled = Event()


class VehicleType(object):

    def __init__(self, name, tag):
        self.shortName = name
        self.classTag = tag
        self.maxHealth = 1000


class Info(object):

    def __init__(self, vehicle_id, team, name, tag):
        self.vehicleID = vehicle_id
        self.team = team
        self.vehicleType = VehicleType(name, tag)

    def isAlive(self):
        return True


VEHICLES = {
    OWN_ID: Info(OWN_ID, OWN_TEAM, 'WZ-111 1-4', 'heavyTank'),
    ARTY_ID: Info(ARTY_ID, 2, 'M53/M55', 'SPG'),
    ALLY_ID: Info(ALLY_ID, OWN_TEAM, 'T-34', 'mediumTank'),
}


class ArenaData(object):

    def getVehiclesInfoIterator(self):
        return iter(VEHICLES.values())


class Avatar(object):

    playerVehicleID = OWN_ID
    team = OWN_TEAM


class Config(object):

    def __init__(self):
        self.switched_on = True

    def is_enabled(self, switch):
        return self.switched_on


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator(STRINGS, 'ru')
        self.config = Config()
        self.in_battle = True


class ChatBan(Exception):
    pass


class Clock(object):

    def __init__(self):
        self.now = 1000.0

    def time(self):
        return self.now


def stub_client():
    for name in STUBBED:
        _support.stub_parents(name)
        sys.modules[name] = types.ModuleType(str(name))
    sys.modules['BigWorld'].player = Avatar
    sys.modules['BigWorld'].callback = lambda *args: None
    sys.modules['BattleFeedbackCommon'].BATTLE_EVENT_TYPE = _feedback.BATTLE_EVENT_TYPE
    sys.modules['constants'].ARENA_PERIOD = type(str('ARENA_PERIOD'), (object,), {str('BATTLE'): BATTLE_PERIOD})
    sys.modules[STATES_MODULE].VEHICLE_VIEW_STATE = type(str('VEHICLE_VIEW_STATE'), (object,), {
        str(name): value for name, value in STATES.items()
    })
    sys.modules['PlayerEvents'].g_playerEvents = None


class AutoMessagesClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        _support.forget_modules(CLIENT_PREFIXES)
        stub_client()
        hud = importlib.import_module('otmetki.core.client.hud')
        hud._state['config'] = ComponentConfig(MemoryFile())
        self.module = importlib.import_module('otmetki.features.auto_messages.client')
        self.lines = []
        self.extras = []
        self.arena = Arena()
        self.patch_client()
        self.app = App()
        self.feature = self.module.AutoMessagesFeature(self.app)
        self.app.bus.emit('battle_ready', Avatar())
        self.feature.settings.update({
            'arty_hit_text': u'Арта ({vehicle}) отстрелялась! По мне :O',
            'team_damage_text': u'{vehicle}, я свой! Минус {hit} ХП :(',
        })

    def patch_client(self):
        module = self.module
        self.clock = Clock()
        module.time = self.clock
        module.send_line = lambda channel, text: self.lines.append((channel, text)) or True
        module.send_extra = lambda extra, position: self.extras.append(extra)
        module.vehicle_info = VEHICLES.get
        module.vehicle_name = lambda vehicle_id: VEHICLES[vehicle_id].vehicleType.shortName
        module.vehicle_class = lambda vehicle_id: VEHICLES[vehicle_id].vehicleType.classTag
        module.is_enemy = lambda vehicle_id: VEHICLES[vehicle_id].team != OWN_TEAM
        module.controls_own_vehicle = lambda: True
        module.arena = lambda: self.arena
        module.arena_dp = ArenaData
        module.is_chat_ban = lambda error: isinstance(error, ChatBan)

    def tearDown(self):
        _support.forget_modules(CLIENT_PREFIXES)
        for name, saved in self.saved.items():
            if saved is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = saved

    def hit_by(self, attacker, reason='shot'):
        kind = _feedback.BATTLE_EVENT_TYPE.RECEIVED_DAMAGE
        self.feature._on_feedback([_feedback.damage(kind, attacker, 350, reason)])

    def test_an_arty_hit_names_the_spg_in_the_team_chat(self):
        self.hit_by(ARTY_ID)

        assert self.lines == [('team', 'Арта (M53/M55) отстрелялась! По мне :O')]

    def test_an_ally_hit_is_team_damage(self):
        self.hit_by(ALLY_ID)

        assert self.lines == [('team', 'T-34, я свой! Минус 350 ХП :(')]

    def test_a_second_arty_hit_waits_for_the_cooldown(self):
        self.hit_by(ARTY_ID)
        self.hit_by(ARTY_ID)

        assert len(self.lines) == 1

    def test_nothing_before_the_countdown_ends(self):
        self.arena.period = BATTLE_PERIOD - 1

        self.hit_by(ARTY_ID)

        assert self.lines == []

    def test_nothing_while_the_camera_follows_an_ally(self):
        self.module.controls_own_vehicle = lambda: False

        self.hit_by(ARTY_ID)

        assert self.lines == []

    def test_switched_off_in_battle_it_stops(self):
        self.app.config.switched_on = False
        self.app.bus.emit('component_settings', 'auto_messages', ['battle_auto_messages'])

        self.hit_by(ARTY_ID)

        assert self.lines == []

    def test_a_refused_line_does_not_start_the_cooldown(self):
        self.module.send_line = lambda channel, text: False
        self.hit_by(ARTY_ID)
        self.module.send_line = lambda channel, text: self.lines.append(text) or True

        self.hit_by(ARTY_ID)

        assert len(self.lines) == 1

    def test_spotted_with_few_allies_sends_the_extra_command(self):
        self.feature.settings.update({'spotted_extra': 'help'})

        self.feature._on_vehicle_state(STATES['OBSERVED_BY_ENEMY'], True)

        assert self.extras == ['help']

    def test_a_chat_ban_stops_every_line(self):
        self.feature._on_chat_error(ChatBan())

        self.hit_by(ARTY_ID)

        assert self.lines == []

    def test_gg_names_the_result(self):
        self.feature.settings.update({'gg': True, 'gg_text': 'gg, {result}'})

        self.feature._on_round_finished(OWN_TEAM, 0, None)

        assert self.lines == [('team', 'gg, победа')]

    def milestone_on(self):
        self.feature.settings.update({
            'damage_milestone': True,
            'damage_milestone_value': 1000,
            'damage_milestone_text': 'milestone',
        })

    def test_a_milestone_the_chat_refused_goes_out_with_the_next_damage(self):
        self.milestone_on()
        self.module.send_line = lambda channel, text: False
        self.feature._add_damage(1200)
        self.patch_client()

        self.feature._add_damage(100)

        assert self.lines == [('team', 'milestone')]

    def test_a_milestone_goes_out_once(self):
        self.milestone_on()
        self.feature._add_damage(1200)

        self.feature._add_damage(100)

        assert len(self.lines) == 1

    def gg_after_a_line(self):
        self.feature.settings.update({'gg': True, 'gg_text': 'gg, {result}'})
        self.hit_by(ARTY_ID)
        scheduled = []
        sys.modules['BigWorld'].callback = lambda delay, callback: scheduled.append((delay, callback))
        self.feature._on_round_finished(OWN_TEAM, 0, None)
        return scheduled

    def test_gg_the_rate_gate_refused_waits_for_the_line_interval(self):
        scheduled = self.gg_after_a_line()

        assert [delay for delay, _ in scheduled] == [10]

    def test_gg_the_rate_gate_refused_goes_out_after_the_interval(self):
        scheduled = self.gg_after_a_line()
        self.clock.now += 10

        scheduled[0][1]()

        assert self.lines[-1] == ('team', 'gg, победа')

    def test_a_trigger_off_by_default_stays_silent(self):
        self.feature._on_vehicle_state(STATES['FIRE'], True)

        assert self.lines == []


if __name__ == '__main__':
    unittest.main()
