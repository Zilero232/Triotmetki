from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle import controls_own_vehicle, player
from ....core.client.component import FeatureComponent
from ....core.client.game import client_attr
from ....core.client.timer import Ticker, game_time
from ....core.hooks import override
from ....core.log import log
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import (
    Stillness,
    TickBlend,
    TickGate,
    argument_names,
    frame_time_diff,
    relax_time,
    server_tick,
    skip_reason,
    supports_rotate,
    turn_time,
    turned,
)
from ..model.constants import FRAME_S
from ..settings import SCHEMA, SWITCH
from .constants import (
    AVATAR_CLASS,
    AVATAR_MODULE,
    CLIENT_MODE_ATTR,
    DISPERSION_METHOD,
    LAST_SHOT_POINT_ATTR,
    MARKER_METHOD,
    PLUGINS_MODULE,
    ROTATE_METHOD,
    ROTATION_TICK_ATTR,
    ROTATOR_CLASS,
    ROTATOR_MODULE,
    SHOT_POINT_ATTR,
    SHOT_RESULT_METHOD,
    SHOT_RESULT_PLUGIN,
    STABILISED_MATRIX_METHOD,
    STARTED_ATTR,
    STOCK_TURN_METHOD,
    TARGET_LAST_ATTR,
    TARGET_LOCK,
    TIME_ATTR,
)


def _is_replay():
    is_playing = client_attr('BattleReplay', 'isPlaying')
    return bool(is_playing()) if is_playing is not None else False


def _descriptor(battle_player):
    return getattr(battle_player, 'vehicleTypeDescriptor', None)


def _class_tags(battle_player):
    return getattr(getattr(_descriptor(battle_player), 'type', None), 'tags', ())


# RU 1.45 client source: VehicleDescriptor.gun.staticTurretYaw, set on guns that never turn sideways.
def _static_yaw(battle_player):
    return getattr(getattr(_descriptor(battle_player), 'gun', None), 'staticTurretYaw', None)


def _lock_mode():
    return getattr(client_attr('constants', 'AIMING_MODE'), TARGET_LOCK, None)


def _aiming_mode():
    return getattr(getattr(player(), 'inputHandler', None), 'getAimingMode', None)


# Math.Vector3 hands its coordinates out through tuple().
def _coords(vector):
    as_tuple = getattr(vector, 'tuple', None)
    if as_tuple is not None:
        return tuple(as_tuple())
    return tuple(vector) if isinstance(vector, (tuple, list)) else ()


def _pose(rotator):
    source = getattr(rotator, STABILISED_MATRIX_METHOD, None)
    matrix = source() if source is not None else None
    if matrix is None:
        return ()
    angles = (getattr(matrix, 'yaw', 0.0), getattr(matrix, 'pitch', 0.0), getattr(matrix, 'roll', 0.0))
    return _coords(getattr(matrix, 'translation', None)) + angles


def _gun_angles(rotator):
    return (getattr(rotator, 'turretYaw', None) or 0.0, getattr(rotator, 'gunPitch', None) or 0.0)


# Fair play: the stock tick still sends the aim to the server at 10 Hz; only the drawing runs every frame.
class ResponsiveReticle(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.rotator = None
        self.lock = None
        self.aiming_mode = None
        self.follow = None
        self.revisions = None
        self.active = False
        self.in_frame = False
        self.dispersion = TickBlend()
        self.shot_results = TickGate()
        self.still = Stillness()
        self.ticker = Ticker(FRAME_S, self._on_frame)
        self.supported = self._hook_client()
        bus = app.bus
        bus.on('battle_ready', self._on_battle_ready)
        bus.on('battle_leave', self.stop)

    def _hook_client(self):
        rotator_class = client_attr(ROTATOR_MODULE, ROTATOR_CLASS)
        rotate = getattr(rotator_class, ROTATE_METHOD, None)
        if rotate is None or getattr(rotator_class, STOCK_TURN_METHOD, None) is None:
            log('responsive reticle: the client has no gun rotator to follow, off')
            return False
        names = argument_names(rotate)
        if not supports_rotate(names):
            log('responsive reticle: unknown rotate signature %r, off' % (names,))
            return False
        override(rotator_class, STOCK_TURN_METHOD)(self._stock_turn)
        avatar_class = client_attr(AVATAR_MODULE, AVATAR_CLASS)
        if getattr(avatar_class, DISPERSION_METHOD, None) is not None:
            override(avatar_class, DISPERSION_METHOD)(self._dispersion)
        plugin_class = client_attr(PLUGINS_MODULE, SHOT_RESULT_PLUGIN)
        if getattr(plugin_class, SHOT_RESULT_METHOD, None) is not None:
            override(plugin_class, SHOT_RESULT_METHOD)(self._shot_result)
        return True

    def _on_battle_ready(self, battle_player):
        self.stop()
        if not self.enabled() or not self.supported:
            return
        reason = skip_reason(_is_replay(), _class_tags(battle_player), _static_yaw(battle_player))
        if reason is not None:
            log('responsive reticle: off in this battle (%s)' % reason)
            return
        self.rotator = getattr(battle_player, 'gunRotator', None)
        if self.rotator is None:
            return
        self.lock = _lock_mode()
        self.revisions = None
        self.active = True
        self.ticker.start()

    def stop(self):
        self.active = False
        self.ticker.stop()
        self.rotator = None
        self.aiming_mode = None
        self.dispersion.clear()
        self.shot_results.clear()
        self.still.clear()

    def settings_changed(self, changed):
        if not self.enabled():
            self.stop()

    def _drives(self, rotator):
        if not getattr(rotator, STARTED_ATTR, False) or not getattr(rotator, CLIENT_MODE_ATTR, False):
            return False
        return controls_own_vehicle() and not self._target_locked()

    def _target_locked(self):
        if self.lock is None:
            return False
        if self.aiming_mode is None:
            self.aiming_mode = _aiming_mode()
        return self.aiming_mode is not None and bool(self.aiming_mode(self.lock))

    def _settings_current(self):
        revisions = (self.app.config.revision, self.settings.revision)
        if revisions != self.revisions:
            self.revisions = revisions
            self.follow = self.settings.get('follow')
            return self.enabled()
        return True

    def _on_frame(self):
        if not self.active or not self.app.in_battle or not self._settings_current():
            self.stop()
            return False
        rotator = self.rotator
        if not self._drives(rotator):
            self.still.clear()
            return True

        shot_point = self._shot_point(rotator)
        if self.still.still(_coords(shot_point) + _pose(rotator)):
            return True

        now = game_time()
        time_diff = frame_time_diff(now, getattr(rotator, TIME_ATTR, None))
        if time_diff is not None:
            setattr(rotator, TIME_ATTR, now)
            self._turn(rotator, shot_point, time_diff)
        return True

    def _stock_turn(self, original, rotator, shot_point, time_diff, *args, **kwargs):
        if rotator is not self.rotator or self.still.idle or not self._drives(rotator):
            return original(rotator, shot_point, time_diff, *args, **kwargs)
        self._turn(rotator, shot_point, time_diff)
        return None

    def _turn(self, rotator, shot_point, time_diff):
        follow = self.follow
        before = _gun_angles(rotator)
        self.in_frame = True
        setattr(rotator, ROTATION_TICK_ATTR, turn_time(follow, time_diff))
        try:
            getattr(rotator, ROTATE_METHOD)(shot_point, time_diff)
            getattr(rotator, MARKER_METHOD)(relax_time(follow, time_diff))
        finally:
            self.in_frame = False
            delattr(rotator, ROTATION_TICK_ATTR)
        self.still.turned(turned(before, _gun_angles(rotator)))

    @staticmethod
    def _shot_point(rotator):
        source = getattr(rotator, SHOT_POINT_ATTR, None)
        shot_point = source() if source is not None else None
        if shot_point is None and getattr(rotator, TARGET_LAST_ATTR, False):
            shot_point = getattr(rotator, LAST_SHOT_POINT_ATTR, None)
        return shot_point

    def _dispersion(self, original, avatar, *args, **kwargs):
        if not self.in_frame:
            return original(avatar, *args, **kwargs)
        return self.dispersion.get(game_time(), lambda: original(avatar, *args, **kwargs))

    def _shot_result(self, original, plugin, marker_type, *args, **kwargs):
        if self.in_frame and not self.shot_results.allow(marker_type, server_tick(game_time())):
            return None
        return original(plugin, marker_type, *args, **kwargs)
