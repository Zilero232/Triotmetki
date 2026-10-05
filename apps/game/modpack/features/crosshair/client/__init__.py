from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle import ammo, call, controls_own_vehicle, crosshair, player, vehicle_info, vehicle_state
from ....core.client.game import values_by_name
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.client.native import ClientDefaults, NativeSettingsComponent, section_is_new
from ....core.client.timer import Ticker
from ..i18n import STRINGS
from ..model import mark_offset, mark_text, shows_in, to_native
from ..model.constants import PREVIEW_SIZE, READOUT_TICK_S
from ..model.editor import editor
from ..model.preview import preview_text, preview_widget
from ..model.readouts import (
    Readouts,
    readouts_data,
    readouts_text,
    reload_left,
    replaced_reticle_parts,
    wants_readouts,
)
from ..model.widget import crosshair_widget
from ..settings import PANEL_ID, SCHEMA, SWITCH
from .constants import CLIP_EVENTS, READOUT_STATES, READOUT_VIEWS, VIEW_ARCADE, VIEW_SNIPER

try:
    from gui.battle_control.battle_constants import VEHICLE_VIEW_STATE
except ImportError:
    VEHICLE_VIEW_STATE = None


PANEL_SPEC = PanelSpec(
    panel_id=PANEL_ID,
    schema=SCHEMA,
    switch=SWITCH,
    strings=STRINGS,
    preview_size=PREVIEW_SIZE,
    preview_text=preview_text,
    preview_widget=preview_widget,
)


def own_max_health():
    vehicle_type = getattr(vehicle_info(getattr(player(), 'playerVehicleID', None)), 'vehicleType', None)
    return getattr(vehicle_type, 'maxHealth', None)


# RU 1.45 ammo_ctrl: the gun settings' clip (size, interval) and getCurrentShells() (quantity, quantity in clip).
def own_clip():
    clip = getattr(call(ammo(), 'getGunSettings'), 'clip', None)
    shells = call(ammo(), 'getCurrentShells', (None, None))
    return getattr(clip, 'size', None), shells[1]


def own_health():
    vehicle = call(vehicle_state(), 'getControllingVehicle')
    return getattr(vehicle, 'health', None)


# The presets are the player's client settings, written by the core's NativeSettingsComponent on the panel's own section
# (only what a change moves; a change made in battle on the next hangar); the centre mark
# and the readouts follow the client's own reticle position (CrosshairDataProxy). Fair play: the readouts are the own
# gun's reload (the ammo controller the stock reticle's reload indicator reads) and the own damage panel's HP; every
# update is dropped while the camera follows an ally (controls_own_vehicle). The stock reticle parts the readouts stand
# in for are hidden (core.hud.stock reticle parts) only while the payload the page got draws them: `drawn_readouts` is
# that payload's readouts, None whenever the panel is off the screen.
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

    def ui_actions(self):
        return self.client_defaults.ui_actions()

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
        self.readouts.set_clip(*own_clip())
        self.hooks.add(ammo, 'onGunReloadTimeSet', self._on_reload)
        for event in CLIP_EVENTS:
            self.hooks.add(ammo, event, self._on_clip)
        self.hooks.add(vehicle_state, 'onVehicleStateUpdated', self._on_vehicle_state)

    def stop(self):
        self.ticker.stop()
        self.readouts = None
        self.drawn_readouts = None
        self.view = None

    def stock_aliases(self):
        return replaced_reticle_parts(self.drawn_readouts)

    def _on_view(self, view):
        self.view = view
        self.render()

    def _on_position(self, *args):
        self.render()

    def _on_reload(self, shell_cd, snapshot, *args):
        if self.readouts is None or not controls_own_vehicle():
            return
        self._set_reload(snapshot)
        self.render()

    def _on_clip(self, *args):
        if self.readouts is not None and controls_own_vehicle() and self.readouts.set_clip(*own_clip()):
            self.render()

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
        if name == 'health':
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

    # The GUIFlash fallback keeps the mark alone so the text never moves it off the reticle centre; without a mark it
    # shows the readouts as plain text.
    def _text(self, with_mark, drawn):
        return (mark_text(self.settings) if with_mark else '') or readouts_text(drawn)

    def _shows_in_current_view(self):
        return shows_in(self.settings.get('modes'), self.view == VIEW_ARCADE, self.view == VIEW_SNIPER)


def create_crosshair(app):
    return CrosshairComponent(app)
