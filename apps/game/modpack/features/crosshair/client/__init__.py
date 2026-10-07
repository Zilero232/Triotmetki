from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle import ammo, call, controls_own_vehicle, crosshair, player, vehicle_info, vehicle_state
from ....core.client.game import values_by_name
from ....core.client.hud import component_config
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.client.native import ClientDefaults, NativeSettingsComponent, section_is_new
from ....core.client.timer import Ticker
from ....core.compat import is_int
from ....core.hooks import is_restorable, override, restore
from ....core.log import log, safe
from ....core.shells import shell_code
from .. import settings
from ..i18n import STRINGS
from ..model import mark_offset, mark_text, preview, shows_in, to_native
from ..model.circle import circle_percent, is_scaled, scaled_size
from ..model.constants import PREVIEW_SIZE, READOUT_TICK_S
from ..model.editor import editor
from ..model.readouts import (
    Readouts,
    readouts_data,
    readouts_text,
    reload_left,
    replaced_reticle_parts,
    wants_readouts,
)
from ..model.widget import crosshair_widget
from ..settings import CIRCLE_PANEL_ID, CIRCLE_SCHEMA, CIRCLE_SWITCH, PANEL_ID, SCHEMA, SWITCH
from .constants import (
    CLIP_EVENTS,
    MARKER_METHOD,
    MARKER_RELAX_ARG,
    READOUT_STATES,
    READOUT_VIEWS,
    STATE_HEALTH,
    VIEW_ARCADE,
    VIEW_SNIPER,
)

try:
    from gui.battle_control.battle_constants import VEHICLE_VIEW_STATE
except ImportError:
    VEHICLE_VIEW_STATE = None

try:
    from AvatarInputHandler.gun_marker_ctrl import _DefaultGunMarkerController
except Exception:
    _DefaultGunMarkerController = None


PANEL_SPEC = PanelSpec.of(settings, STRINGS, preview, PREVIEW_SIZE)


def own_max_health():
    vehicle_type = getattr(vehicle_info(getattr(player(), 'playerVehicleID', None)), 'vehicleType', None)
    return getattr(vehicle_type, 'maxHealth', None)


# RU 1.45 ammo_ctrl: getCurrentShellCD() is None until the client sets the shells.
def own_clip():
    settings = call(ammo(), 'getGunSettings')
    shells = call(ammo(), 'getCurrentShells', (None, None))
    shell_cd = call(ammo(), 'getCurrentShellCD')
    shell = call(settings, 'getShellDescriptor', None, shell_cd) if is_int(shell_cd) and shell_cd > 0 else None
    size = getattr(getattr(settings, 'clip', None), 'size', None)
    return size, shells[1], shell_code(getattr(shell, 'kind', None)), bool(getattr(shell, 'isGold', False))


def own_health():
    vehicle = call(vehicle_state(), 'getControllingVehicle')
    return getattr(vehicle, 'health', None)


# Fair play: the readouts are the own vehicle's; the mark follows CrosshairDataProxy.
class CrosshairComponent(BattlePanel):

    def __init__(self, app):
        is_new_section = section_is_new(app, PANEL_ID)
        self.states = values_by_name(VEHICLE_VIEW_STATE, READOUT_STATES)
        self.readouts = None
        self.drawn_readouts = None
        self.ticker = Ticker(READOUT_TICK_S, self._on_tick)
        BattlePanel.__init__(self, app, PANEL_SPEC)
        self.view = None
        self.native = NativeSettingsComponent(app, PANEL_ID, SCHEMA, SWITCH, STRINGS, to_native)
        self.client_defaults = ClientDefaults(self.native, is_new_section)
        self.circle_settings = component_config(app).section(CIRCLE_PANEL_ID, CIRCLE_SCHEMA)
        self.circle_installed = False
        self.circle_missing_logged = False
        app.bus.on('battle_enter', self.install_circle)
        app.bus.on('battle_leave', self.remove_circle)

    def ui_actions(self):
        return self.client_defaults.ui_actions()

    # Fair play: the gun marker the client computed, drawn at a share of its size.
    @safe
    def install_circle(self):
        if self.circle_installed or not self._wants_circle():
            return
        if _DefaultGunMarkerController is None:
            if not self.circle_missing_logged:
                self.circle_missing_logged = True
                log('crosshair: the aim circle stays the client size')
            return
        self.circle_installed = True
        component = self

        @override(_DefaultGunMarkerController, MARKER_METHOD)
        def _update(original, controller, *args, **kwargs):
            result = original(controller, *args, **kwargs)
            if len(args) > MARKER_RELAX_ARG:
                component.scale_circle(controller, args[MARKER_RELAX_ARG])
            return result

    @safe
    def remove_circle(self):
        if not self.circle_installed or not is_restorable(_DefaultGunMarkerController, MARKER_METHOD):
            return
        restore(_DefaultGunMarkerController, MARKER_METHOD)
        self.circle_installed = False

    def _wants_circle(self):
        return bool(self.app.config.is_enabled(CIRCLE_SWITCH)) and is_scaled(self.circle_settings.get('size'))

    def scale_circle(self, controller, relax_time):
        choice = self.circle_settings.get('size')
        provider = getattr(controller, '_dataProvider', None)
        if not self.app.config.is_enabled(CIRCLE_SWITCH) or not is_scaled(choice) or provider is None:
            return
        provider.updateSize(scaled_size(controller.getSize(), circle_percent(choice)), relax_time)

    def ui_action(self, action, row=None, value=None):
        return self.client_defaults.ui_action(action)

    def ui_editor(self):
        return editor(self.settings, self.app.translate)

    def _in_hangar(self):
        return BattlePanel._in_hangar(self) and self._draws_anything()

    def _draws_anything(self):
        return bool(mark_text(self.settings)) or wants_readouts(self.settings)

    def start(self, battle_player):
        if not self._draws_anything():
            return
        self.view = call(crosshair(), 'getViewID')
        self.hooks.add(crosshair, 'onCrosshairViewChanged', self._on_view)
        self.hooks.add(crosshair, 'onCrosshairPositionChanged', self._on_position)
        self.hooks.add(crosshair, 'onCrosshairScaleChanged', self._on_position)
        if wants_readouts(self.settings):
            self._start_readouts()
        self.render()

    def _start_readouts(self):
        self.readouts = Readouts()
        self.readouts.set_health(own_health(), own_max_health())
        snapshot = call(ammo(), 'getGunReloadingState')
        if snapshot is not None:
            self._set_reload(snapshot)
        self._read_clip()
        if call(call(ammo(), 'getGunSettings'), 'hasAutoReload', False):
            self._set_auto_reload(call(ammo(), 'getAutoReloadingState'))
        self.readouts.set_zoom(self._zoom())
        self.hooks.add(ammo, 'onGunReloadTimeSet', self._on_reload)
        self.hooks.add(ammo, 'onGunAutoReloadTimeSet', self._on_auto_reload)
        for event in CLIP_EVENTS:
            self.hooks.add(ammo, event, self._on_clip)
        self.hooks.add(vehicle_state, 'onVehicleStateUpdated', self._on_vehicle_state)
        self.hooks.add(crosshair, 'onCrosshairZoomFactorChanged', self._on_zoom)

    def stop(self):
        self.ticker.stop()
        self.readouts = None
        self.drawn_readouts = None
        self.view = None

    def stock_aliases(self):
        return replaced_reticle_parts(self.drawn_readouts)

    def _on_view(self, view):
        self.view = view
        if self.readouts is not None:
            self.readouts.set_zoom(self._zoom())
        self.render()

    def _on_zoom(self, factor):
        if self.readouts is not None and self.readouts.set_zoom(self._zoom(factor)):
            self.render()

    def _zoom(self, factor=None):
        if self.view != VIEW_SNIPER:
            return None
        return call(crosshair(), 'getZoomFactor') if factor is None else factor

    def _on_position(self, *args):
        self.render()

    def _on_reload(self, shell_cd, snapshot, *args):
        if self.readouts is None or not controls_own_vehicle():
            return
        self._set_reload(snapshot)
        self.render()

    def _on_clip(self, *args):
        if self.readouts is not None and controls_own_vehicle() and self._read_clip():
            self.render()

    def _read_clip(self):
        gun = call(ammo(), 'getGunSettings')
        self.readouts.set_autoloader(call(gun, 'hasAutoReload', False))
        self.readouts.set_interval(call(gun, 'getClipInterval'), call(gun, 'getLastAmmoCount', 1))
        changed = self.readouts.set_clip(*own_clip())
        self.readouts.set_drum_reload(call(ammo(), 'getShellChangeTime'))
        return changed

    def _on_auto_reload(self, snapshot, *args):
        if self.readouts is None or not controls_own_vehicle():
            return
        self._set_auto_reload(snapshot)
        self.render()

    def _set_auto_reload(self, snapshot):
        left = reload_left(call(snapshot, 'getActualValue'), call(snapshot, 'getTimeLeft'))
        self.readouts.set_auto_reload(left, call(snapshot, 'getBaseValue'))
        self._count()

    def _set_reload(self, snapshot):
        left = reload_left(call(snapshot, 'getActualValue'), call(snapshot, 'getTimeLeft'))
        self.readouts.set_reload(left, call(snapshot, 'getBaseValue'))
        self._count()

    def _on_vehicle_state(self, state, value):
        name = self.states.get(state)
        if self.readouts is None or name is None or not controls_own_vehicle():
            return
        if self._apply_state(name, value):
            self._count()
            self.render()

    def _apply_state(self, name, value):
        if name == STATE_HEALTH:
            return self.readouts.set_health(value, own_max_health())
        return self.readouts.set_health(0)

    def _count(self):
        if self.readouts.is_counting():
            self.ticker.restart_elapsed()
            self.ticker.start()

    def _on_tick(self):
        if self.readouts is None:
            return False
        counting = self.readouts.tick(self.ticker.elapsed())
        self.render()
        return counting

    def render(self):
        ctrl = crosshair()
        with_mark = self._shows_in_current_view()
        readouts = self.readouts if controls_own_vehicle() and self.view in READOUT_VIEWS else None
        drawn = readouts_data(readouts, self.settings, self.app.translate)
        draws_mark = with_mark and bool(mark_text(self.settings))
        if ctrl is None or not (draws_mark or drawn):
            self._hide_all()
            return
        payload = crosshair_widget(self.settings, self.app.translate, readouts, sketch=False, with_mark=with_mark)
        self.drawn_readouts = drawn
        if not self.show(self._text(with_mark, drawn), payload):
            self.drawn_readouts = None
            self.sync_stock()
            return

        position = call(ctrl, 'getScaledPosition', (0, 0))
        size = call(ctrl, 'getSize', (0, 0))
        scale = call(ctrl, 'getScaleFactor', 1.0)
        x, y = mark_offset(position, size, scale, self.settings)
        self.hud.place(PANEL_ID, x, y)

    def _hide_all(self):
        self.drawn_readouts = None
        self.hide()
        self.sync_stock()

    def _text(self, with_mark, drawn):
        return (mark_text(self.settings) if with_mark else '') or readouts_text(drawn)

    def _shows_in_current_view(self):
        return shows_in(self.settings.get('modes'), self.view == VIEW_ARCADE, self.view == VIEW_SNIPER)


def create_crosshair(app):
    return CrosshairComponent(app)
