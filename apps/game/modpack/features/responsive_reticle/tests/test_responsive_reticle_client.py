from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig
from otmetki.core.storage import MemoryFile
from otmetki.features.responsive_reticle.i18n import STRINGS

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.responsive_reticle.client')
PLUGINS = 'gui.Scaleform.daapi.view.battle.shared.crosshair.plugins'
STUBBED = (
    'BigWorld', 'BattleReplay', 'constants', 'VehicleGunRotator', 'Avatar', 'gui', 'gui.Scaleform',
    'gui.Scaleform.daapi', 'gui.Scaleform.daapi.view', 'gui.Scaleform.daapi.view.battle',
    'gui.Scaleform.daapi.view.battle.shared', 'gui.Scaleform.daapi.view.battle.shared.crosshair', PLUGINS,
)
TARGET_LOCK = 3
OWN_VEHICLE = 7
ALLY_VEHICLE = 9
SHOT_POINT = (10.0, 0.0, 250.0)
DISPERSION = [0.1, 0.05, 0.0, 0.0]


class Namespace(object):

    def __init__(self, **attrs):
        self.__dict__.update(attrs)


def stub(name, **attrs):
    stubbed = types.ModuleType(str(name))
    stubbed.__dict__.update(attrs)
    sys.modules[name] = stubbed
    return stubbed


class Client(object):
    """The client pieces the component drives: the clock, BigWorld.callback, the own avatar and its gun rotator."""

    def __init__(self, realm='RU', replay=False):
        self.now = [100.0]
        self.callbacks = []
        self.locked = False
        self.controlled = OWN_VEHICLE
        self.dispersion_calls = []
        self.shot_results = []
        self.rotator_class = self.make_rotator_class()
        self.avatar_class = self.make_avatar_class()
        self.plugin_class = self.make_plugin_class()
        stub('BigWorld', callback=lambda delay, fn: self.callbacks.append(fn), time=lambda: self.now[0],
             player=lambda: self.player)
        stub('BattleReplay', isPlaying=lambda: replay)
        stub('constants', CURRENT_REALM=realm, AIMING_MODE=type(str('AIMING_MODE'), (object,), {'TARGET_LOCK': 3}))
        stub('VehicleGunRotator', VehicleGunRotator=self.rotator_class)
        stub('Avatar', PlayerAvatar=self.avatar_class)
        for name in STUBBED[5:-1]:
            stub(name)
        stub(PLUGINS, ShotResultIndicatorPlugin=self.plugin_class)
        self.player = self.avatar_class()

    def make_rotator_class(self):
        client = self

        class VehicleGunRotator(object):

            def __init__(self):
                self.__isStarted = True
                self.__clientMode = True
                self.__time = 100.0
                self.__targetLastShotPoint = False
                self.__lastShotPoint = None
                self.__shotPointSourceFunctor = lambda: SHOT_POINT
                self.turns = []
                self.markers = []

            def __rotate(self, shotPoint, timeDiff):
                self.turns.append((shotPoint, round(timeDiff, 3)))
                client.player.getOwnVehicleShotDispersionAngle(1.5)

            def __updateGunMarker(self, forceRelaxTime=None):
                self.markers.append(round(forceRelaxTime, 3))
                client.plugin._ShotResultIndicatorPlugin__onGunMarkerStateChanged('client', (1, 2, 3), None, None)

        return VehicleGunRotator

    def make_avatar_class(self):
        client = self

        class PlayerAvatar(object):

            def __init__(self):
                self.gunRotator = client.rotator_class()
                self.vehicleTypeDescriptor = descriptor(frozenset(['mediumTank']))
                self.inputHandler = Namespace(getAimingMode=lambda mode: client.locked)
                self.playerVehicleID = OWN_VEHICLE
                state = Namespace(getControllingVehicleID=lambda: client.controlled)
                self.guiSessionProvider = Namespace(shared=Namespace(vehicleState=state))

            def getOwnVehicleShotDispersionAngle(self, speed):
                client.dispersion_calls.append(speed)
                return list(DISPERSION)

        return PlayerAvatar

    def make_plugin_class(self):
        client = self

        class ShotResultIndicatorPlugin(object):

            def __onGunMarkerStateChanged(self, markerType, position, direction, collision):
                client.shot_results.append(markerType)

        return ShotResultIndicatorPlugin

    @property
    def plugin(self):
        return self.plugin_class()

    def frame(self, seconds=0.016):
        self.now[0] += seconds
        callbacks, self.callbacks = self.callbacks, []
        for callback in callbacks:
            callback()


def descriptor(tags, static_yaw=None):
    return Namespace(type=Namespace(tags=tags), gun=Namespace(staticTurretYaw=static_yaw))


class Config(object):

    def __init__(self):
        self.on = True

    def is_enabled(self, switch):
        return self.on


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator(STRINGS)
        self.config = Config()
        self.in_battle = False


class ResponsiveReticleClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED)
        self.purge()

    def tearDown(self):
        for name, saved in self.saved.items():
            if saved is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = saved
        self.purge()

    @staticmethod
    def purge():
        _support.forget_modules(CLIENT_PREFIXES)

    def start(self, **client_options):
        self.client = Client(**client_options)
        hud = importlib.import_module('otmetki.core.client.hud')
        hud._state['config'] = ComponentConfig(MemoryFile())
        module = importlib.import_module('otmetki.features.responsive_reticle.client')
        self.app = App()
        self.component = module.ResponsiveReticle(self.app)
        self.rotator = self.client.player.gunRotator
        return self.component

    def battle(self, **client_options):
        self.start(**client_options)
        self.app.bus.emit('battle_ready', self.client.player)

    def test_every_frame_turns_the_gun_by_the_frame_time(self):
        self.battle()
        self.client.frame(0.016)
        self.client.frame(0.016)

        assert self.rotator.turns == [(SHOT_POINT, 0.016), (SHOT_POINT, 0.016)]

    def test_the_marker_relaxes_within_the_frame(self):
        self.battle()
        self.client.frame(0.016)

        assert self.rotator.markers == [0.016]

    def test_the_rotator_clock_is_stamped_so_the_stock_tick_skips_the_turn(self):
        self.battle()
        self.client.frame(0.016)

        assert self.rotator._VehicleGunRotator__time == self.client.now[0]

    def test_the_dispersion_is_worked_out_once_per_server_tick(self):
        self.battle()
        for _ in range(5):
            self.client.frame(0.016)

        assert len(self.client.dispersion_calls) == 1

    def test_the_shot_result_is_worked_out_once_per_server_tick(self):
        self.battle()
        for _ in range(5):
            self.client.frame(0.016)

        assert self.client.shot_results == ['client']

    def test_a_new_server_tick_works_them_out_again(self):
        self.battle()
        self.client.frame(0.016)
        self.client.frame(0.1)

        assert len(self.client.dispersion_calls) == 2
        assert self.client.shot_results == ['client', 'client']

    def test_the_stock_tick_keeps_its_own_dispersion(self):
        self.battle()
        self.client.player.getOwnVehicleShotDispersionAngle(0.0)
        self.client.player.getOwnVehicleShotDispersionAngle(0.0)

        assert self.client.dispersion_calls == [0.0, 0.0]

    def test_the_auto_aim_lock_leaves_the_turn_to_the_stock_tick(self):
        self.battle()
        self.client.locked = True
        self.client.frame(0.016)

        assert self.rotator.turns == []

    def test_an_ally_followed_after_death_is_not_turned(self):
        self.battle()
        self.client.controlled = ALLY_VEHICLE
        self.client.frame(0.016)

        assert self.rotator.turns == []

    def test_a_stopped_rotator_is_not_turned(self):
        self.battle()
        self.rotator._VehicleGunRotator__isStarted = False
        self.client.frame(0.016)

        assert self.rotator.turns == []

    def test_a_replay_is_left_alone(self):
        self.battle(replay=True)
        self.client.frame(0.016)

        assert self.rotator.turns == []

    def test_an_spg_is_left_alone(self):
        self.start()
        self.client.player.vehicleTypeDescriptor = descriptor(frozenset(['SPG']))
        self.app.bus.emit('battle_ready', self.client.player)
        self.client.frame(0.016)

        assert self.rotator.turns == []

    def test_a_gun_without_traverse_is_left_alone(self):
        self.start()
        self.client.player.vehicleTypeDescriptor = descriptor(frozenset(['AT-SPG']), static_yaw=0.0)
        self.app.bus.emit('battle_ready', self.client.player)
        self.client.frame(0.016)

        assert self.rotator.turns == []

    def test_switched_off_it_does_nothing(self):
        self.start()
        self.app.config.on = False
        self.app.bus.emit('battle_ready', self.client.player)
        self.client.frame(0.016)

        assert self.rotator.turns == []

    def test_switching_off_in_battle_stops_the_frames(self):
        self.battle()
        self.app.config.on = False
        self.client.frame(0.016)
        self.client.frame(0.016)

        assert self.rotator.turns == []
        assert self.client.callbacks == []

    def test_leaving_the_battle_stops_the_frames(self):
        self.battle()
        self.app.bus.emit('battle_leave')
        self.client.frame(0.016)

        assert self.rotator.turns == []

    def test_the_last_shot_point_is_kept_when_the_camera_has_none(self):
        self.battle()
        self.rotator._VehicleGunRotator__shotPointSourceFunctor = lambda: None
        self.rotator._VehicleGunRotator__targetLastShotPoint = True
        self.rotator._VehicleGunRotator__lastShotPoint = 'last'
        self.client.frame(0.016)

        assert self.rotator.turns == [('last', 0.016)]

    def test_the_wg_client_with_the_known_signature_runs(self):
        self.battle(realm='EU')
        self.client.frame(0.016)

        assert len(self.rotator.turns) == 1

    def test_an_unknown_rotate_signature_keeps_it_off(self):
        client = Client()

        def rotate(rotator, shotPoint, timeDiff, gunIndex):
            rotator.turns.append(gunIndex)

        client.rotator_class._VehicleGunRotator__rotate = rotate
        hud = importlib.import_module('otmetki.core.client.hud')
        hud._state['config'] = ComponentConfig(MemoryFile())
        module = importlib.import_module('otmetki.features.responsive_reticle.client')

        assert module.ResponsiveReticle(App()).supported is False


if __name__ == '__main__':
    unittest.main()
