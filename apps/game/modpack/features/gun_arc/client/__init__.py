from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle import call, controls_own_vehicle, crosshair, player, vehicle_state
from ....core.client.game import client_attr, client_module
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.client.timer import Ticker
from ....core.log import safe
from ..i18n import STRINGS
from ..model import marker_offsets, reticle_offset, screen_offset, screen_size, sector_points
from ..model.constants import EMPTY_DRAWN, FAST_TICK_S, MARK_NAMES, NO_LIMITS, PREVIEW_SIZE, TICK_S
from ..model.preview import preview_text, preview_widget
from ..model.widget import empty_widget, panel_widget
from ..settings import PANEL_ID, SCHEMA, SWITCH
from .constants import MATH_MODULE, PROJECTION_FUNCTION, PROJECTION_MODULE


# RU 1.45 client source: VehicleDescriptor.gun.turretYawLimits, (min, max) in radians or None.
def yaw_limits(battle_player):
    descriptor = getattr(battle_player, 'vehicleTypeDescriptor', None)
    gun = getattr(descriptor, 'gun', None)
    return getattr(gun, 'turretYawLimits', None)


def _vector(value):
    return value.x, value.y, value.z


# RU 1.45 client source: Avatar.getOwnVehicleStabilisedMatrix and VehicleGunRotator.markerInfo.
def own_aim(math):
    avatar = player()
    hull = call(avatar, 'getOwnVehicleStabilisedMatrix')
    marker = getattr(getattr(avatar, 'gunRotator', None), 'markerInfo', None)
    if hull is None or not marker:
        return None
    matrix = math.Matrix(hull)
    return _vector(matrix.translation), matrix.yaw, _vector(marker[0])


def project(math, matrix, point):
    clip = matrix.applyV4Point(math.Vector4(point[0], point[1], point[2], 1.0))
    return clip.x, clip.y, clip.z, clip.w


class ClientMath(object):

    def __init__(self):
        self.math = None
        self.projection = None

    def ready(self):
        if self.math is None:
            self.math = client_module(MATH_MODULE)
        if self.projection is None:
            self.projection = client_attr(PROJECTION_MODULE, PROJECTION_FUNCTION)
        return self.math is not None and self.projection is not None

    def view_projection(self):
        return call(self.projection, '__call__')


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
        self.client = ClientMath()
        self.drawn = None
        self.has_panel = False
        self.ticker = Ticker(TICK_S, self._on_tick)
        BattlePanel.__init__(self, app, PANEL_SPEC)

    def start(self, battle_player):
        self.hooks.add(vehicle_state, 'onVehicleControlling', self._on_vehicle_controlling)
        self._follow_vehicle(battle_player)

    # Respawn modes hand the player a new vehicle in the same battle.
    def _on_vehicle_controlling(self, vehicle):
        battle_player = player()
        is_own = getattr(vehicle, 'id', None) == getattr(battle_player, 'playerVehicleID', None)
        if is_own:
            self._follow_vehicle(battle_player)

    def _follow_vehicle(self, battle_player):
        self.limits = yaw_limits(battle_player)
        if not self.limits:
            self.wait(NO_LIMITS)
            self._take_off()
            return

        self.drawn = None
        self.wait(None)
        self._follow_redraw_setting()
        self.ticker.start()

    def stop(self):
        self.ticker.stop()
        self.limits = None
        self.drawn = None
        self.has_panel = False

    def settings_changed(self, changed):
        self.drawn = None
        self._follow_redraw_setting()

    def _follow_redraw_setting(self):
        self.ticker.interval_s = FAST_TICK_S if self.settings.get('fast_redraw') else TICK_S

    def _on_tick(self):
        if not self.limits or not self.app.in_battle:
            self.limits = None
            return False
        self.render()
        return True

    @safe
    def render(self):
        ctrl = crosshair()
        if ctrl is None or not controls_own_vehicle():
            self._take_off()
            return
        size = call(ctrl, 'getSize', (0, 0))
        scale = call(ctrl, 'getScaleFactor', 1.0)
        reticle = reticle_offset(call(ctrl, 'getScaledPosition', (0, 0)), size, scale)
        offsets = marker_offsets(self._marks_on_screen(screen_size(size, scale)), reticle)
        drawn = (sorted(offsets.items()), int(round(reticle[0])), int(round(reticle[1])))
        if drawn == self.drawn:
            return
        self._draw(offsets, reticle, drawn)

    def _draw(self, offsets, reticle, drawn):
        payload = panel_widget(offsets, self.settings)
        if payload is None:
            self._take_off()
            return

        if not self.show(u'', payload):
            self.drawn = None
            return

        self.hud.place(PANEL_ID, reticle[0], reticle[1])
        self.drawn = drawn
        self.has_panel = True

    # The panel stays on the page with no markers: a mount per toggle crashed cohtml (0.3.11).
    def _take_off(self):
        if self.drawn == EMPTY_DRAWN or not self.has_panel:
            return

        self.show(u'', empty_widget(self.settings))
        self.drawn = EMPTY_DRAWN

    def _marks_on_screen(self, screen):
        if not self.client.ready():
            return None
        math = self.client.math
        aim = own_aim(math)
        matrix = self.client.view_projection()
        if aim is None or matrix is None:
            return None
        points = sector_points(aim[0], aim[1], aim[2], self.limits)
        if points is None:
            return None
        return {name: screen_offset(project(math, matrix, points[name]), screen) for name in MARK_NAMES}
