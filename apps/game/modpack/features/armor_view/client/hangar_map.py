from __future__ import absolute_import, division, print_function, unicode_literals

import functools
from ....core.armor import PENETRATION_RANDOMNESS, power_at
from ....core.client.armor import (
    camera_pose,
    cursor_clip,
    distance_factor,
    gun_shots,
    hangar_vehicle_entity,
    loaded_appearance,
    probe,
    screen_ray,
    screen_size,
    shell_randomization,
    vehicle_key,
    vehicle_name,
)
from ....core.client.hotkey import Hotkey
from ....core.client.timer import Ticker, game_time
from ....core.hud import HangarLabel
from ....core.log import guarded, log
from ....core.vendor import attr
from ..model import (
    Attack,
    LegendView,
    cell_code,
    has_moved,
    legend_widget,
    map_widget,
    readout,
    screen_fraction,
    shell_label,
    stepped,
)
from ..model.constants import (
    KEY_ACTIONS,
    MODE_BY_ACTION,
    MODE_SHELL,
    SHELL_STEPS,
    STATUS_BUILDING,
    STATUS_MOVING,
    STATUS_NO_COLLISION,
    STATUS_PAUSED,
    STATUS_READY,
    STATUS_WAITING,
)
from .constants import LEGEND_LAYOUT, LEGEND_PANEL, MAP_LAYOUT, MAP_PANEL, PROGRESS_STEPS, TICK_S
from .escape import EscapeHold
from .session import MapSession


@attr.s(frozen=True)
class Attacker(object):
    """The tank whose gun the shell mode fires: its name and its gun's `(shot, Shell)` pairs."""

    name = attr.ib()
    shots = attr.ib()


def attacker_of(descriptor):
    if descriptor is None:
        return None
    return Attacker(name=vehicle_name(descriptor), shots=gun_shots(descriptor))


@guarded('armor view: HUD edit mode', False)
def _is_editing(ui):
    editing = getattr(getattr(ui, 'backend', None), 'editing', None)
    return bool(editing()) if editing is not None else False


def _attack(shot, shell, distance):
    power = power_at(shell, distance, distance_factor(shot, distance))
    return Attack(shell=shell, power=power, randomness=PENETRATION_RANDOMNESS)


def _progress(build):
    if build is None:
        return None
    steps = int(build.progress * PROGRESS_STEPS)
    return steps / PROGRESS_STEPS


# The in-hangar armour map: rays through the hangar vehicle's collision under a grid over its screen bounds, cast on
# every frame within a budget, the cells drawn by the HUD page's armor_map widget once each level is complete; a
# hover card from one ray under the cursor; the keys of KEY_ACTIONS and Esc while it is open. Hangar only: the
# component closes it on a battle, and it never reads anything but the hangar vehicle's own collision and descriptor
# and the attacker's gun.
class HangarMap(object):

    def __init__(self, app, settings):
        self.app = app
        self.settings = settings
        self.map_label = HangarLabel(app, MAP_PANEL)
        self.legend_label = HangarLabel(app, LEGEND_PANEL)
        self.ticker = Ticker(TICK_S, self._tick)
        self.keys = [Hotkey(key, (), functools.partial(self.on_key, action)) for key, action in KEY_ACTIONS]
        self.escape = EscapeHold(self.close)
        self.is_open = False
        self.mode = settings.get('mode')
        self.attacker = None
        self.shell_index = 0
        self.attack = None
        self.shell_labels = ()
        self.session = None
        self.status = STATUS_WAITING
        self.hover_key = None
        self.hover = None

    def open(self, attacker_descriptor):
        if self.is_open:
            return
        self.is_open = True
        self.mode = self.settings.get('mode')
        self.attacker = attacker_of(attacker_descriptor)
        self.shell_index = 0
        self._refresh_attack()

        for hotkey in self.keys:
            hotkey.install()
        self.escape.hold()
        self.ticker.start()
        self._log_open()

    def close(self):
        if not self.is_open:
            return
        self.is_open = False
        self.ticker.stop()
        for hotkey in self.keys:
            hotkey.remove()
        self.escape.release()

        self.map_label.hide()
        self.legend_label.hide()
        self.session = None
        log('armor view: hangar map closed')

    def _log_open(self):
        if self.attacker is None:
            detail = self.settings.get('detail')
            log('armor view: hangar map open (mode %s, detail %s, no attacker)' % (self.mode, detail))
            return
        shots = self.attacker.shots
        randomization = [shell_randomization(shot) for shot, _ in shots]
        log('armor view: hangar map open (mode %s, detail %s, attacker %s, %d shells, client randomization %s)' % (
            self.mode, self.settings.get('detail'), self.attacker.name, len(shots), randomization,
        ))

    def settings_changed(self):
        if not self.is_open:
            return
        self._refresh_attack()
        self.session = None
        self.map_label.clear()

    def on_key(self, action):
        if not self.is_open:
            return
        if action in MODE_BY_ACTION:
            self.mode = MODE_BY_ACTION[action]
        elif action in SHELL_STEPS:
            self._step_shell(SHELL_STEPS[action])
        else:
            self._pin_attacker()
        self._redraw()

    def _step_shell(self, step):
        if self.mode != MODE_SHELL:
            self.mode = MODE_SHELL
            return
        count = len(self.attacker.shots) if self.attacker is not None else 0
        self.shell_index = stepped(self.shell_index, count, step)

    def _pin_attacker(self):
        appearance = loaded_appearance(hangar_vehicle_entity())
        if appearance is None:
            return
        self.attacker = attacker_of(appearance.typeDescriptor)
        self.shell_index = 0
        self.mode = MODE_SHELL
        self._log_open()

    def _refresh_attack(self):
        shots = self.attacker.shots if self.attacker is not None else ()
        distance = self.settings.get('distance')
        attacks = [_attack(shot, shell, distance) for shot, shell in shots]

        self.shell_labels = tuple(shell_label(attack.shell, attack.power, self.app.translate) for attack in attacks)
        self.attack = None
        if attacks:
            self.shell_index = min(self.shell_index, len(attacks) - 1)
            self.attack = attacks[self.shell_index]

    def _redraw(self):
        self._refresh_attack()
        self.hover_key = None
        build = self.session.build if self.session is not None else None
        if build is None:
            return
        build.recode(self._code_of)
        self._draw_finished(build)

    def _code_of(self, plates):
        return cell_code(plates, self.mode, self.attack)

    def _is_paused(self):
        ui = self.app.ui
        is_hidden = not getattr(ui, 'in_view', True)
        return is_hidden or _is_editing(ui)

    def _tick(self):
        if not self.is_open:
            return False
        if self._is_paused():
            self._step_aside()
            return True
        entity = hangar_vehicle_entity()
        appearance = loaded_appearance(entity)
        if appearance is None:
            self._wait()
            return True

        self._work(entity, appearance, game_time() or 0.0)
        self._push_legend(vehicle_name(appearance.typeDescriptor))
        return True

    def _work(self, entity, appearance, now):
        session = self._session_for(entity, appearance, now)
        if session.is_settling(now) or session.is_waiting(now):
            self.status = STATUS_MOVING if session.retries == 0 else STATUS_WAITING
            return
        self._build(session, entity, appearance, now)
        self._hover(session, appearance)

    def _step_aside(self):
        self.map_label.clear()
        self.legend_label.clear()
        self.status = STATUS_PAUSED

    def _wait(self):
        self.status = STATUS_WAITING
        self.session = None
        self.hover = None
        self.map_label.clear()
        self._push_legend(u'')

    def _session_for(self, entity, appearance, now):
        key = vehicle_key(entity, appearance)
        pose = camera_pose()
        session = self.session
        is_same_vehicle = session is not None and session.vehicle == key
        if is_same_vehicle and not has_moved(session.pose, pose):
            return session

        self.session = MapSession(key, pose, now)
        self.hover_key = None
        self.map_label.clear()
        return self.session

    def _build(self, session, entity, appearance, now):
        if session.is_failed:
            self.status = STATUS_NO_COLLISION
            return
        if session.build is None and not session.begin(entity, screen_size(), self.settings.get('detail')):
            self.status = STATUS_WAITING
            return
        build = session.build
        self._draw_missing(build)
        if build.is_done:
            self.status = STATUS_READY
            return

        self.status = STATUS_BUILDING
        session.cast(appearance, self._code_of)
        if build.is_level_done:
            self._finish_level(session, now)

    def _finish_level(self, session, now):
        build = session.build
        is_first = build.level_index == 0
        level, codes = build.finish_level()
        if is_first and not any(codes):
            self._retry_empty(session, now)
            return

        self._draw(level, codes)
        if build.is_done:
            self.status = STATUS_READY
            log(session.summary())

    def _retry_empty(self, session, now):
        if session.retry_empty(now):
            return
        session.give_up()
        self.status = STATUS_NO_COLLISION
        log('armor view: the hangar vehicle answered no ray after %d tries (%s)' % (session.retries, session.summary()))

    def _draw(self, level, codes):
        widget = map_widget(level, codes, self.mode, self.settings.get('opacity'))
        self.map_label.show(u'', MAP_LAYOUT, on_moved=self._put_map_back, widget=widget)

    def _draw_finished(self, build):
        finished = build.finished()
        if finished is not None:
            self._draw(*finished)

    def _draw_missing(self, build):
        if self.map_label.widget is None:
            self._draw_finished(build)

    def _put_map_back(self, props):
        self.app.ui.place(MAP_PANEL, MAP_LAYOUT)

    def _hover(self, session, appearance):
        cursor = cursor_clip()
        key = (cursor, id(session), self.mode, self.shell_index, id(self.attacker))
        if key == self.hover_key:
            return
        self.hover_key = key
        self.hover = self._hover_card(session, appearance, cursor)

    def _hover_card(self, session, appearance, cursor):
        if cursor is None or session.box is None:
            return None
        x, y = screen_fraction(*cursor)
        if not session.box.contains(x, y):
            return None
        segment = screen_ray(*cursor)
        if segment is None:
            return None

        plates = probe(appearance, *segment)
        return readout(plates, self.mode, self.attack, self.app.translate)

    def _push_legend(self, target):
        build = self.session.build if self.session is not None else None
        view = LegendView(
            target=target,
            mode=self.mode,
            status=self.status,
            attacker=self.attacker.name if self.attacker is not None else None,
            shell_labels=self.shell_labels,
            shell_index=self.shell_index,
            distance=self.settings.get('distance'),
            progress=_progress(build),
            readout=self.hover,
        )
        self.legend_label.show(u'', LEGEND_LAYOUT, widget=legend_widget(view, self.app.translate))
