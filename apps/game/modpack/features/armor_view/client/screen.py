from __future__ import absolute_import, division, print_function, unicode_literals

import json

from ....core.client.armor import hangar_vehicle_entity, loaded_appearance
from ....core.client.hangar_preview import HangarPreview, vehicle_compact_descr
from ....core.client.sub_view import SubViewHost, move_camera
from ....core.client.timer import Ticker, game_time
from ....core.compat import string_types
from ....core.events import EVENT_SETTINGS_CLOSE
from ....core.log import guarded, log, safe
from ....core.sub_view import SubViewPage
from ..model import PageView, armor_url, decode_message, page_state, status_state
from ..model.constants import (
    COMMAND_ATTACKER,
    COMMAND_CAMERA,
    COMMAND_CLOSE,
    COMMAND_DIAG,
    COMMAND_DISTANCE,
    COMMAND_HOVER,
    COMMAND_LEAVE,
    COMMAND_MODE,
    COMMAND_MODULES,
    COMMAND_MOVE,
    COMMAND_READY,
    COMMAND_SEARCH,
    COMMAND_SHELL,
    COMMAND_SITE,
    COMMAND_TANK,
    MODE_SHELL,
    STATUS_LOADING,
    STATUS_WAITING,
)
from .attacker import AttackerFire, ShownVehicle
from .browser import open_external
from .builder import MapBuilder
from .camera import fly_to
from .constants import (
    EMPTY_JSON,
    ESCAPE_PROPERTY,
    HOVER_PROPERTY,
    LOGGED_MESSAGE_CHARS,
    MAP_PROPERTY,
    PAGE_PROPERTIES,
    RES_MAP_ID,
    STATE_PROPERTY,
    STATUS_PROPERTY,
    TICK_S,
)
from .garage import selected_tank
from .selection import TankSelection


def _text(value):
    return EMPTY_JSON if value is None else json.dumps(value)


@guarded('armor view: shown type')
def _shown_type(appearance):
    return appearance.typeDescriptor.type.compactDescr


# The armour screen: a lobby sub view (core.client.sub_view) over the real hangar tank, its page drawing the map the
# builder casts and taking the mouse; the hangar vehicle is swapped through the stock vehicle preview
# (core.client.hangar_preview) for a tank that is not the selected one or another turret and gun.
class ArmorScreen(object):

    def __init__(self, component):
        self.component = component
        self.settings = component.settings
        page = SubViewPage(key=RES_MAP_ID, properties=PAGE_PROPERTIES)
        self.window = SubViewHost(page, self.on_message, self._on_escape, self._on_ready, self._on_window_gone)
        self.hangar = HangarPreview('armor view', self._on_preview_loaded)
        self.builder = MapBuilder(self.settings, component.app.translate, self)
        self.ticker = Ticker(TICK_S, self._tick)
        self.tanks = TankSelection()
        self.fire = AttackerFire(self.settings.get('distance'))
        self.escapes = 0
        self.is_swapped = False
        self.is_camera_moved = False
        self.mode = self.settings.get('mode')

    @property
    def is_open(self):
        return self.window.is_open

    @property
    def target(self):
        return self.tanks.target

    @property
    def translate(self):
        return self.component.app.translate

    def available(self):
        return self.window.available()

    @safe
    def open(self, tank_id):
        self.component.app.bus.emit(EVENT_SETTINGS_CLOSE)
        if self.is_open:
            self.select_tank(tank_id)
            return True
        if not self.window.available():
            log('armor view: not opened: the armour page is not registered with OpenWG Gameface')
            return False
        self._begin(tank_id)
        self.window.open()
        return True

    def _begin(self, tank_id):
        self.is_swapped = False
        self.is_camera_moved = False
        self.mode = self.settings.get('mode')
        self.fire = AttackerFire(self.settings.get('distance'))

        self.hangar.begin()
        self.tanks.begin(tank_id)
        self.fire.set_from(selected_tank(), is_target=False)
        self._restyle()
        self.ticker.start()
        self._log_open()

    def _log_open(self):
        target = self.target.row.name if self.target is not None else u'-'
        attacker = self.fire.attacker.name if self.fire.attacker is not None else u'-'
        log('armor view: opened on %s, %d garage tanks, attacker %s with %d shells (mode %s, detail %s)' % (
            target, len(self.tanks.garage), attacker, len(self.fire.attacks), self.mode, self.settings.get('detail'),
        ))

    @safe
    def close(self, restore_hangar=True):
        if not self.is_open:
            return
        self.window.close(restore_hangar)
        self._release()

    @safe
    def _on_escape(self):
        if self.window.view is None:
            self.close()
            return
        self.escapes += 1
        self.window.push(ESCAPE_PROPERTY, str(self.escapes))

    @safe
    def _on_window_gone(self):
        self._release()

    def _release(self):
        self.ticker.stop()
        self.hangar.end(reset_camera=self.is_camera_moved)
        self.builder.wait(STATUS_WAITING)
        self.builder.set_cursor(None)
        log(self.builder.timing.summary())
        log('armor view: closed')

    @safe
    def _on_ready(self):
        self._apply_target()
        self.push_all()

    @safe
    def _on_preview_loaded(self):
        if self.target is not None:
            log('armor view: preview %s (%d) is in the hangar' % (self.target.row.name, self.target.cd))

    def _apply_target(self):
        target = self.target
        if target is None:
            return
        if not self.is_swapped and self.tanks.is_home():
            return
        compact = vehicle_compact_descr(target.cd, target.chassis, target.choice.turret, target.choice.gun)
        if self.hangar.show(target.cd, compact):
            self.is_swapped = True
            self.builder.wait(STATUS_LOADING)

    def select_tank(self, tank_id):
        if self.tanks.pick_tank(tank_id):
            self._apply_target()
            self.push_state()

    def _select_modules(self, turret_cd, gun_cd):
        if self.tanks.pick_modules(turret_cd, gun_cd):
            self._apply_target()
            self.push_state()

    def _shown_vehicle(self, tank_id):
        is_shown = self.target is not None and tank_id == self.target.cd
        appearance = loaded_appearance(hangar_vehicle_entity())
        if not is_shown or appearance is None:
            return None
        return ShownVehicle(tank_id, appearance.typeDescriptor)

    def _pick_attacker(self, tank_id):
        own = self.tanks.own(tank_id)
        if own is not None:
            return self.fire.set_from(own, is_target=False)
        return self.fire.set_from(self._shown_vehicle(tank_id), is_target=True)

    def _restyle(self):
        self.builder.set_style(self.mode, self.fire.attack)

    def _view(self):
        target = self.target
        return PageView(
            tank=target.row if target is not None else None,
            mode=self.mode,
            garage=self.tanks.garage,
            query=self.tanks.query,
            matches=self.tanks.matches,
            turrets=target.turrets if target is not None else (),
            choice=target.choice if target is not None else None,
            attacker=self.fire.attacker,
            shell_labels=self.fire.labels(self.translate),
            shell_index=self.fire.shell_index,
            distance=self.fire.distance,
        )

    def push_state(self):
        state = page_state(self._view(), self.translate)
        self.window.push(STATE_PROPERTY, json.dumps(state))

    def push_map(self, state):
        self.window.push(MAP_PROPERTY, _text(state))

    def push_hover(self, card):
        self.window.push(HOVER_PROPERTY, _text(card))

    def push_status(self):
        state = status_state(self.builder.status, self.builder.progress, self.translate)
        self.window.push(STATUS_PROPERTY, json.dumps(state))

    def push_all(self):
        self.push_state()
        self.push_status()

    def _tick(self):
        if not self.is_open:
            return False
        if self.window.view is not None:
            self._build()
            self.push_status()
        return True

    def _build(self):
        entity = hangar_vehicle_entity()
        appearance = loaded_appearance(entity)
        if appearance is None or self.target is None:
            self.builder.wait(STATUS_LOADING if self.is_swapped else STATUS_WAITING)
            return
        if _shown_type(appearance) != self.target.cd:
            self.builder.wait(STATUS_LOADING)
            return
        self.builder.tick(entity, appearance, self._label(), game_time() or 0.0)

    def _label(self):
        kind = 'preview' if self.is_swapped else 'garage'
        return u'%s (%s)' % (self.target.row.name, kind)

    def _fly(self, preset_id):
        if fly_to(self.hangar.camera_manager(), hangar_vehicle_entity(), preset_id):
            self.is_camera_moved = True

    def _open_site(self):
        if self.target is None:
            return
        url = armor_url(self.target.cd, self.translate.language)
        log('armor view: open %s' % url)
        open_external(url)

    def _changed(self, is_changed=True):
        if not is_changed:
            return
        self._restyle()
        self.push_state()

    def _set_mode(self, mode):
        self.mode = mode
        self._changed()

    def _set_shell(self, index):
        if self.fire.pick_shell(index):
            self.mode = MODE_SHELL
            self._changed()

    def _set_distance(self, metres):
        self.fire.set_distance(metres)
        self._changed()

    def _set_query(self, query):
        self.tanks.search(query)
        self.push_state()

    def _set_attacker(self, tank_id):
        self._changed(self._pick_attacker(tank_id))

    def _handlers(self, fields):
        return {
            COMMAND_READY: lambda: self.push_all(),
            COMMAND_CLOSE: lambda: self.close(),
            COMMAND_MOVE: lambda: move_camera(fields['dx'], fields['dy'], fields['dz']),
            COMMAND_HOVER: lambda: self.builder.set_cursor((fields['x'], fields['y'])),
            COMMAND_LEAVE: lambda: self.builder.set_cursor(None),
            COMMAND_MODE: lambda: self._set_mode(fields['mode']),
            COMMAND_SHELL: lambda: self._set_shell(fields['index']),
            COMMAND_DISTANCE: lambda: self._set_distance(fields['m']),
            COMMAND_TANK: lambda: self.select_tank(fields['cd']),
            COMMAND_MODULES: lambda: self._select_modules(fields['turret'], fields['gun']),
            COMMAND_ATTACKER: lambda: self._set_attacker(fields['cd']),
            COMMAND_SEARCH: lambda: self._set_query(fields['text']),
            COMMAND_CAMERA: lambda: self._fly(fields['preset']),
            COMMAND_SITE: lambda: self._open_site(),
            COMMAND_DIAG: lambda: log('armor view: %s' % fields['text'][:LOGGED_MESSAGE_CHARS]),
        }

    @safe
    def on_message(self, raw):
        decoded = decode_message(raw)
        if decoded is None:
            shown = raw[:LOGGED_MESSAGE_CHARS] if isinstance(raw, string_types) else type(raw).__name__
            log('armor view: a page message was not understood: %r' % (shown,))
            return
        command, fields = decoded
        self._handlers(fields)[command]()
