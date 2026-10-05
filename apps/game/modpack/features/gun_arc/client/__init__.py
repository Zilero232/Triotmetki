from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle import call, controls_own_vehicle, crosshair, player
from ....core.client.game import client_attr
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.client.timer import Ticker
from ....core.log import safe
from ..i18n import STRINGS
from ..model import marker_offsets, reticle_offset, screen_offset, screen_size, sector_points
from ..model.constants import FAST_TICK_S, MARK_NAMES, NO_LIMITS, PREVIEW_SIZE, TICK_S
from ..model.preview import preview_text, preview_widget
from ..model.widget import panel_widget
from ..settings import PANEL_ID, SCHEMA, SWITCH
from .constants import PROJECTION_FUNCTION, PROJECTION_MODULE


# RU 1.45 client source: VehicleDescriptor.gun.turretYawLimits, (min, max) in radians or None
# (gui/battle_control/vehicle_getter).
def yaw_limits(battle_player):
    descriptor = getattr(battle_player, 'vehicleTypeDescriptor', None)
    gun = getattr(descriptor, 'gun', None)
    return getattr(gun, 'turretYawLimits', None)


def _vector(value):
    return value.x, value.y, value.z


# RU 1.45 client source: Avatar.getOwnVehicleStabilisedMatrix (the hull without its sway, the matrix the gun rotator
# aims from) and VehicleGunRotator.markerInfo, (the gun marker's world point, direction, size). None while either is
# missing (the battle is still loading).
def own_aim():
    avatar = player()
    hull = call(avatar, 'getOwnVehicleStabilisedMatrix')
    marker = getattr(getattr(avatar, 'gunRotator', None), 'markerInfo', None)
    if hull is None or not marker:
        return None
    import Math
    matrix = Math.Matrix(hull)
    return _vector(matrix.translation), matrix.yaw, _vector(marker[0])


def view_projection():
    getter = client_attr(PROJECTION_MODULE, PROJECTION_FUNCTION)
    return call(getter, '__call__')


def project(matrix, point):
    import Math
    clip = matrix.applyV4Point(Math.Vector4(point[0], point[1], point[2], 1.0))
    return clip.x, clip.y, clip.z, clip.w


PANEL_SPEC = PanelSpec(
    panel_id=PANEL_ID,
    schema=SCHEMA,
    switch=SWITCH,
    strings=STRINGS,
    preview_size=PREVIEW_SIZE,
    preview_text=preview_text,
    preview_widget=preview_widget,
)


class GunArcPanel(BattlePanel):

    def __init__(self, app):
        self.limits = None
        self.ticker = Ticker(TICK_S, self._on_tick)
        BattlePanel.__init__(self, app, PANEL_SPEC)

    def start(self, battle_player):
        self.limits = yaw_limits(battle_player)
        self.wait(None if self.limits else NO_LIMITS)
        if self.limits:
            self._follow_redraw_setting()
            self.ticker.start()

    def stop(self):
        self.ticker.stop()
        self.limits = None

    def settings_changed(self, changed):
        self._follow_redraw_setting()

    def _follow_redraw_setting(self):
        self.ticker.interval_s = FAST_TICK_S if self.settings.get('fast_redraw') else TICK_S

    def _on_tick(self):
        if not self.limits:
            return False
        self.render()
        return True

    @safe
    def render(self):
        ctrl = crosshair()
        if ctrl is None or not controls_own_vehicle():
            self.hide()
            return
        size = call(ctrl, 'getSize', (0, 0))
        scale = call(ctrl, 'getScaleFactor', 1.0)
        reticle = reticle_offset(call(ctrl, 'getScaledPosition', (0, 0)), size, scale)
        payload = panel_widget(marker_offsets(self._marks_on_screen(screen_size(size, scale)), reticle), self.settings)
        if payload is None or not self.show(u'', payload):
            self.hide()
            return
        self.hud.place(PANEL_ID, reticle[0], reticle[1])

    def _marks_on_screen(self, screen):
        aim = own_aim()
        matrix = view_projection()
        if aim is None or matrix is None:
            return None
        points = sector_points(aim[0], aim[1], aim[2], self.limits)
        if points is None:
            return None
        return dict((name, screen_offset(project(matrix, points[name]), screen)) for name in MARK_NAMES)
