from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.client.battle import call, controls_own_vehicle, crosshair, feedback
from ....core.client.game import client_attr
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.client.timer import game_time
from ....core.hooks import override
from ....core.log import log, safe
from ..i18n import STRINGS
from ..model import has_body, scaled_size, shell_lines, shell_stats, with_lines
from ..model.armor import TickGate, format_armor, reticle_place, view_offset
from ..model.constants import NO_RESOLVER, NO_TARGET, PLACEMENT_RETICLE, PREVIEW_SIZE, TICK_S, VIEW_POSTMORTEM
from ..model.preview import preview_text, preview_widget
from ..model.widget import armor_widget
from ..settings import PANEL_ID, SCHEMA, SWITCH
from .armor import ArmorReader
from .constants import (
    ATTRS_CHANGED,
    FEEDBACK_EVENT_CLASS,
    FEEDBACK_MODULE,
    GUN_PIERCING,
    MARKER_METHOD,
    MARKER_RELAX_ARG,
    MARKER_STATE_EVENT,
    POSITION_EVENT,
    SHELL_TOOLTIP_METHOD,
    TRACK_METHOD,
    VIEW_EVENT,
)

try:
    from gui.Scaleform.daapi.view.battle.shared.crosshair.plugins import TargetDistancePlugin
except Exception:  # the plugin moved: the stock distance rule stays
    TargetDistancePlugin = None

try:
    from gui.Scaleform.daapi.view.battle.shared.consumables_panel import ConsumablesPanel
except Exception:  # the panel moved: the stock tooltips stay
    ConsumablesPanel = None

try:
    from AvatarInputHandler.gun_marker_ctrl import _DefaultGunMarkerController
except Exception:  # the controller moved: the stock circle stays
    _DefaultGunMarkerController = None


def _speed_factor():
    try:
        from items import vehicles
        return vehicles.g_cache.commonConfig['miscParams']['projectileSpeedFactor']
    except Exception:  # no vehicle cache (the checks): the speed line is left out
        return None


def _gun_number(gun_settings, method, int_cd):
    read = getattr(gun_settings, method, None)
    return read(int_cd) if read is not None else None


def _attrs_changed_event():
    return getattr(client_attr(FEEDBACK_MODULE, FEEDBACK_EVENT_CLASS), ATTRS_CHANGED, None)


PANEL_SPEC = PanelSpec(
    panel_id=PANEL_ID,
    schema=SCHEMA,
    switch=SWITCH,
    strings=STRINGS,
    preview_size=PREVIEW_SIZE,
    preview_text=preview_text,
    preview_widget=preview_widget,
)


# The overrides (the reticle distance, the shell tooltips, the aim circle) are installed once and read their switch
# on every call; the armour readout is the panel: it follows the client's own shot-result resolution while the
# player's own battle runs and shows only while an enemy vehicle is under the reticle, in every camera view with a
# gun marker (arcade, sniper, the SPG's top view), as the stock marker colour and Battle Observer's armour calculator.
class AimInfo(BattlePanel):

    def __init__(self, app):
        self.installed = False
        self.reader = None
        self.gate = TickGate()
        self.piercing_multiplier = 1
        self.shown = None
        self.aim = None
        self.flush_due = False
        BattlePanel.__init__(self, app, PANEL_SPEC)
        self.install()

    def on(self, key):
        return self.enabled() and bool(self.settings.get(key))

    @safe
    def install(self):
        if self.installed:
            return
        self.installed = True
        self._install_distance()
        self._install_tooltips()
        self._install_circle()

    def _install_distance(self):
        if TargetDistancePlugin is None or not hasattr(TargetDistancePlugin, TRACK_METHOD):
            log('aim_info: the reticle distance stays stock')
            return
        component = self

        @override(TargetDistancePlugin, TRACK_METHOD)
        def _should_track(original, plugin, target):
            if component.on('target_distance'):
                return True
            return original(plugin, target)

    def _install_tooltips(self):
        if ConsumablesPanel is None or not hasattr(ConsumablesPanel, SHELL_TOOLTIP_METHOD):
            log('aim_info: the shell tooltips stay stock')
            return
        component = self

        @override(ConsumablesPanel, SHELL_TOOLTIP_METHOD)
        def _make_shell_tooltip(original, panel, descriptor, gun_settings, int_cd, *args, **kwargs):
            tooltip = original(panel, descriptor, gun_settings, int_cd, *args, **kwargs)
            if not component.on('shell_tooltips'):
                return tooltip
            return component.shell_tooltip(tooltip, descriptor, gun_settings, int_cd)

    def shell_tooltip(self, tooltip, descriptor, gun_settings, int_cd):
        piercing = _gun_number(gun_settings, 'getPiercingPower', int_cd)
        stats = shell_stats(
            getattr(descriptor, 'damage', None),
            piercing[0] if isinstance(piercing, (tuple, list)) and piercing else None,
            _gun_number(gun_settings, 'getShotSpeed', int_cd),
            _speed_factor(),
        )
        return with_lines(tooltip, shell_lines(stats, self.app.translate, not has_body(tooltip)))

    def _install_circle(self):
        if _DefaultGunMarkerController is None:
            log('aim_info: the aim circle stays stock')
            return
        component = self

        @override(_DefaultGunMarkerController, MARKER_METHOD)
        def _update(original, controller, *args, **kwargs):
            result = original(controller, *args, **kwargs)
            if component.on('aim_circle') and len(args) > MARKER_RELAX_ARG:
                component.scale_circle(controller, args[MARKER_RELAX_ARG])
            return result

    def scale_circle(self, controller, relax_time):
        provider = getattr(controller, '_dataProvider', None)
        if provider is not None:
            provider.updateSize(scaled_size(controller.getSize(), self.settings.get('aim_circle_scale')), relax_time)

    def start(self, battle_player):
        self.reader = ArmorReader()
        self.piercing_multiplier = 1
        self.gate.clear()
        self.shown = None
        self.aim = None
        self.flush_due = False
        if not self.reader.available():
            self.reader = None
            self.wait(NO_RESOLVER)
            return
        self.wait(NO_TARGET)
        self.hooks.add(crosshair, MARKER_STATE_EVENT, self._on_marker_state)
        self.hooks.add(crosshair, VIEW_EVENT, self._on_view)
        self.hooks.add(crosshair, POSITION_EVENT, self._on_reticle_moved)
        self.hooks.add(feedback, 'onVehicleFeedbackReceived', self._on_vehicle_feedback)

    def stop(self):
        self.reader = None
        self.shown = None
        self.aim = None
        self.gate.clear()

    def settings_changed(self, changed):
        if self.running and not self.settings.get('armor_under_aim'):
            self._hide_readout()

    def _on_vehicle_feedback(self, event_id, _, value):
        if event_id == _attrs_changed_event() and isinstance(value, dict):
            self.piercing_multiplier = value.get(GUN_PIERCING, 1)

    def _reads(self):
        return self.reader is not None and bool(self.settings.get('armor_under_aim'))

    # RU 1.45 client source: aih_global_binding._Observable sends the marker state only when it changes, so once the
    # aim settles no update follows; the latest state of a tick is resolved when the tick ends, never dropped.
    def _on_marker_state(self, marker_type, position, direction, collision):
        if not self._reads():
            return
        self.aim = (position, direction, collision)
        if self.gate.allow(game_time()):
            self._resolve()
            return
        if not self.flush_due:
            self.flush_due = True
            BigWorld.callback(TICK_S, self._flush)

    @safe
    def _flush(self):
        self.flush_due = False
        if self.aim is not None and self._reads():
            self._resolve()

    def _resolve(self):
        position, direction, collision = self.aim
        self.aim = None
        readout = None
        if controls_own_vehicle():
            readout = self.reader.read(position, direction, collision, self.piercing_multiplier)
        self.render(readout)

    # The dead player's view has no gun marker, so no marker update would ever take the readout off.
    def _on_view(self, view):
        if view == VIEW_POSTMORTEM:
            self.aim = None
            self._hide_readout()
            return
        self._on_reticle_moved()

    def _on_reticle_moved(self, *args):
        if self.shown is not None:
            self._follow_reticle()

    @safe
    def render(self, readout):
        if readout is None:
            self._hide_readout()
            return
        text = format_armor(readout, self.settings, self.app.translate)
        shown = (text, armor_widget(readout, self.settings, self.app.translate))
        if shown != self.shown:
            self.shown = shown
            self.show(*shown)
        self._follow_reticle()

    def _hide_readout(self):
        if self.shown is not None:
            self.shown = None
            self.hide()

    # The camera mode decides where the reticle is (the arcade reticle sits above the centre, the sniper one in it, the
    # SPG's top view moves it with the mouse): the readout keeps its offset under the reticle of the mode on screen.
    def _follow_reticle(self):
        if self.settings.get('placement') != PLACEMENT_RETICLE:
            return
        ctrl = crosshair()
        offset = view_offset(call(ctrl, 'getViewID'), self.settings)
        if ctrl is None or offset is None:
            return
        position = call(ctrl, 'getScaledPosition', (0, 0))
        size = call(ctrl, 'getSize', (0, 0))
        x, y = reticle_place(position, size, call(ctrl, 'getScaleFactor', 1.0), offset)
        self.hud.place(PANEL_ID, x, y)
