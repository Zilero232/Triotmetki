from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig
from _support import MemoryFile
from otmetki.features.responsive_reticle.i18n import STRINGS
from otmetki.features.responsive_reticle.model.constants import FOLLOW_SMOOTH, INSTANT_RELAX_S, SMOOTH_RELAX_S

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
DISPERSION = [0.1, 0.05, 0.0, 0.0]
STOCK_TICK_S = 0.1


class Namespace(object):

    def __init__(self, **attrs):
        self.__dict__.update(attrs)


class Event(object):

    def __init__(self):
        self.handlers = []

    def __iadd__(self, handler):
        self.handlers.append(handler)
        return self

    def __isub__(self, handler):
        self.handlers.remove(handler)
        return self

    def __call__(self, *args):
        for handler in list(self.handlers):
            handler(*args)


class Vector(object):

    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z

    def tuple(self):
        return (self.x, self.y, self.z)


SHOT_POINT = Vector(10.0, 0.0, 250.0)


def stub(name, **attrs):
    stubbed = types.ModuleType(str(name))
    stubbed.__dict__.update(attrs)
    sys.modules[name] = stubbed
    return stubbed


class Client(object):
    def __init__(self, realm='RU', replay=False):
        self.now = [100.0]
        self.callbacks = []
        self.locked = False
        self.controlled = OWN_VEHICLE
        self.dispersion_calls = []
        self.dispersion = list(DISPERSION)
        self.shot_results = []
        self.matrix = Namespace(translation=Vector(0.0, 0.0, 0.0), yaw=0.0, pitch=0.0, roll=0.0)
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
            __ROTATION_TICK_LENGTH = STOCK_TICK_S

            def __init__(self):
                self.__isStarted = True
                self.__clientMode = True
                self.__time = 100.0
                self.__targetLastShotPoint = False
                self.__lastShotPoint = None
                self.__shotPointSourceFunctor = lambda: SHOT_POINT
                self.turretYaw = 0.0
                self.gunPitch = 0.0
                self.turns = []
                self.glides = []
                self.markers = []
                self.dispersions = []

            def __rotate(self, shotPoint, timeDiff):
                self.turns.append((shotPoint, round(timeDiff, 3)))
                self.glides.append(round(self.__ROTATION_TICK_LENGTH, 3))
                self.turretYaw = getattr(shotPoint, 'x', 0.0) * 0.01 + client.matrix.yaw
                self.dispersions.append(client.player.getOwnVehicleShotDispersionAngle(1.5))

            def __updateGunMarker(self, forceRelaxTime=None):
                relax = self.__ROTATION_TICK_LENGTH if forceRelaxTime is None else forceRelaxTime
                self.markers.append(round(relax, 3))
                client.plugin._ShotResultIndicatorPlugin__onGunMarkerStateChanged('client', (1, 2, 3), None, None)

            def getAvatarOwnVehicleStabilisedMatrix(self):
                return client.matrix

            def updateRotationAndGunMarker(self, shotPoint, timeDiff):
                self.__rotate(shotPoint, timeDiff)
                self.__updateGunMarker()

            def stock_tick(self):
                timeDiff = client.now[0] - self.__time
                if timeDiff < 0.02:
                    return
                self.__time = client.now[0]
                self.updateRotationAndGunMarker(self.__shotPointSourceFunctor(), timeDiff)

        return VehicleGunRotator

    def make_avatar_class(self):
        client = self

        class PlayerAvatar(object):

            def __init__(self):
                self.gunRotator = client.rotator_class()
                self.vehicleTypeDescriptor = descriptor(frozenset(['mediumTank']))
                self.inputHandler = Namespace(getAimingMode=lambda mode: client.locked)
                self.playerVehicleID = OWN_VEHICLE
                state = Namespace(getControllingVehicleID=lambda: client.controlled, onVehicleControlling=Event())
                self.guiSessionProvider = Namespace(shared=Namespace(vehicleState=state))

            def getOwnVehicleShotDispersionAngle(self, speed):
                client.dispersion_calls.append(speed)
                return list(client.dispersion)

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

    def frame(self, seconds=0.016, stock_tick=False):
        self.now[0] += seconds
        if stock_tick:
            self.player.gunRotator.stock_tick()
        callbacks = self.callbacks
        self.callbacks = []
        for callback in callbacks:
            callback()

    def aim(self, x):
        self.player.gunRotator._VehicleGunRotator__shotPointSourceFunctor = lambda: Vector(x, 0.0, 250.0)


def descriptor(tags, static_yaw=None):
    return Namespace(type=Namespace(tags=tags), gun=Namespace(staticTurretYaw=static_yaw))


class Config(object):

    def __init__(self):
        self.switch = True
        self.revision = 0

    @property
    def on(self):
        return self.switch

    @on.setter
    def on(self, value):
        self.switch = value
        self.revision += 1

    def is_enabled(self, switch):
        return self.switch


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator(STRINGS)
        self.config = Config()
        self.in_battle = False
        self.bus.on('battle_ready', lambda player: setattr(self, 'in_battle', True))
        self.bus.on('battle_leave', lambda: setattr(self, 'in_battle', False))


class ResponsiveReticleClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
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

    def test_the_instant_marker_lands_at_once(self):
        self.battle()
        self.client.frame(0.016)

        assert self.rotator.markers == [0.001]

    def test_the_gun_models_glide_over_the_frame_during_a_frame_turn(self):
        self.battle()
        self.client.frame(0.016)

        assert self.rotator.glides == [0.016]

    def test_the_glide_time_is_the_stock_one_again_after_the_frame(self):
        self.battle()
        self.client.frame(0.016)

        assert '_VehicleGunRotator__ROTATION_TICK_LENGTH' not in vars(self.rotator)

    def test_frames_without_aim_movement_do_not_turn(self):
        self.battle()
        for _ in range(6):
            self.client.frame(0.016)

        assert len(self.rotator.turns) == 2

    def test_frames_without_aim_movement_do_not_move_the_marker(self):
        self.battle()
        for _ in range(6):
            self.client.frame(0.016)

        assert len(self.rotator.markers) == 2

    def test_moving_the_aim_turns_again(self):
        self.battle()
        for _ in range(4):
            self.client.frame(0.016)
        self.client.aim(20.0)
        self.client.frame(0.016)

        assert len(self.rotator.turns) == 3

    def test_moving_the_own_vehicle_turns_again(self):
        self.battle()
        for _ in range(4):
            self.client.frame(0.016)
        self.client.matrix.yaw = 0.2
        self.client.frame(0.016)

        assert len(self.rotator.turns) == 3

    def test_a_still_aim_leaves_the_stock_tick_its_own_glide(self):
        self.battle()
        for _ in range(4):
            self.client.frame(0.016)
        self.client.frame(0.016, stock_tick=True)

        assert self.rotator.markers[-1] == STOCK_TICK_S

    def test_a_stock_tick_after_a_long_frame_turns_through_the_component(self):
        self.battle()
        self.client.aim(11.0)
        self.client.frame(0.03)
        self.client.aim(12.0)
        self.client.frame(0.03, stock_tick=True)

        assert self.rotator.markers == [0.001, 0.001]

    def test_a_long_frame_writes_the_marker_once(self):
        self.battle()
        self.client.aim(11.0)
        self.client.frame(0.03, stock_tick=True)

        assert len(self.rotator.markers) == 1

    def test_the_circle_glides_between_two_ticks(self):
        self.battle()
        self.client.frame(0.016)
        self.client.dispersion = [0.3, 0.05, 0.0, 0.0]
        for x in (11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0):
            self.client.aim(x)
            self.client.frame(0.016)

        sizes = [round(dispersion[0], 3) for dispersion in self.rotator.dispersions]
        assert sizes == [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.132, 0.164]

    def test_the_rotator_clock_is_stamped_so_the_stock_tick_skips_the_turn(self):
        self.battle()
        self.client.frame(0.016)

        assert self.rotator._VehicleGunRotator__time == self.client.now[0]

    def test_the_dispersion_is_worked_out_once_per_server_tick(self):
        self.battle()
        for x in (11.0, 12.0, 13.0, 14.0, 15.0):
            self.client.aim(x)
            self.client.frame(0.016)

        assert len(self.client.dispersion_calls) == 1

    def test_the_shot_result_is_worked_out_once_per_server_tick(self):
        self.battle()
        for x in (11.0, 12.0, 13.0, 14.0, 15.0):
            self.client.aim(x)
            self.client.frame(0.016)

        assert self.client.shot_results == ['client']

    def test_a_new_server_tick_works_them_out_again(self):
        self.battle()
        self.client.frame(0.016)
        self.client.aim(20.0)
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

    def respawn(self, tags, vehicle_id=OWN_VEHICLE):
        self.client.player.vehicleTypeDescriptor = descriptor(frozenset(tags))
        state = self.client.player.guiSessionProvider.shared.vehicleState
        state.onVehicleControlling(Namespace(id=vehicle_id))

    def test_a_respawn_in_an_spg_stops_the_frame_turns(self):
        self.battle()
        self.respawn(['SPG'])

        self.client.frame(0.016)

        assert self.rotator.turns == []

    def test_a_respawn_from_an_spg_starts_the_frame_turns(self):
        self.start()
        self.client.player.vehicleTypeDescriptor = descriptor(frozenset(['SPG']))
        self.app.bus.emit('battle_ready', self.client.player)
        self.respawn(['mediumTank'])

        self.client.frame(0.016)

        assert self.rotator.turns == [(SHOT_POINT, 0.016)]

    def test_following_a_teammate_keeps_the_own_vehicle(self):
        self.battle()
        self.respawn(['SPG'], vehicle_id=ALLY_VEHICLE)

        self.client.frame(0.016)

        assert self.rotator.turns == [(SHOT_POINT, 0.016)]

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

    def test_the_frames_stop_once_the_battle_is_over_without_a_leave_event(self):
        self.battle()
        self.app.in_battle = False
        self.client.frame(0.016)

        assert self.rotator.turns == []
        assert self.client.callbacks == []

    def test_a_follow_mode_changed_in_battle_reaches_the_next_turn(self):
        self.battle()
        self.client.frame(0.016)
        importlib.import_module('otmetki.core.client.hud')._state['config'].update(
            'responsive_reticle', {'follow': FOLLOW_SMOOTH})
        self.client.aim(20.0)
        self.client.frame(0.016)

        assert self.rotator.markers == [INSTANT_RELAX_S, SMOOTH_RELAX_S]

    def test_an_input_handler_without_the_aiming_mode_still_turns(self):
        self.start()
        self.client.player.inputHandler = Namespace()
        self.app.bus.emit('battle_ready', self.client.player)
        self.client.frame(0.016)

        assert self.rotator.turns == [(SHOT_POINT, 0.016)]

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
