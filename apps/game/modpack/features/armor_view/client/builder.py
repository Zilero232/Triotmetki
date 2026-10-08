from __future__ import absolute_import, division, print_function, unicode_literals

from timeit import default_timer

from ....core.client.armor import camera_pose, probe, screen_ray, screen_size, vehicle_key
from ....core.log import log
from ..model import RayTiming, cell_code, has_moved, map_state, readout
from ..model.constants import (
    MODE_SHELL,
    STATUS_BUILDING,
    STATUS_MOVING,
    STATUS_NO_COLLISION,
    STATUS_READY,
    STATUS_WAITING,
)
from .session import MapSession


def _clip(point):
    x, y = point
    return x * 2.0 - 1.0, 1.0 - y * 2.0


# Fair play: reads only the hangar vehicle's own collision and descriptor and the attacker's gun. The map is built
# coarse to fine within the frame budget (MapSession), redrawn from its kept plates when the mode or the shell changes;
# one ray under the page's cursor gives the card.
class MapBuilder(object):

    def __init__(self, settings, translate, sink):
        self.settings = settings
        self.translate = translate
        self.sink = sink
        self.mode = settings.get('mode')
        self.attack = None
        self.session = None
        self.status = STATUS_WAITING
        self.cursor = None
        self.hover_key = None
        self.timing = RayTiming()

    @property
    def progress(self):
        build = self.session.build if self.session is not None else None
        return build.progress if build is not None else None

    def set_style(self, mode, attack):
        self.mode = mode
        self.attack = attack
        self.hover_key = None
        build = self.session.build if self.session is not None else None
        if build is None:
            return
        build.recode(self._code_of)
        finished = build.finished()
        if finished is not None:
            self._draw(*finished)

    def set_cursor(self, point):
        self.cursor = point
        if point is None:
            self.hover_key = None
            self.sink.push_hover(None)

    def wait(self, status):
        self.status = status
        if self.session is None:
            return
        self.session = None
        self.hover_key = None
        self.sink.push_map(None)
        self.sink.push_hover(None)

    def tick(self, entity, appearance, label, now):
        session = self._session_for(entity, appearance, label, now)
        if session.is_settling(now) or session.is_waiting(now):
            self.status = STATUS_MOVING if session.retries == 0 else STATUS_WAITING
            return
        self._build(session, entity, appearance, now)
        self._hover(session, appearance)

    def _code_of(self, plates):
        attack = self.attack if self.mode == MODE_SHELL else None
        return cell_code(plates, self.mode, attack)

    def _session_for(self, entity, appearance, label, now):
        key = vehicle_key(entity, appearance)
        pose = camera_pose()
        session = self.session
        is_same_vehicle = session is not None and session.vehicle == key
        if is_same_vehicle and not has_moved(session.pose, pose):
            return session

        self.session = MapSession(key, label, pose, now)
        self.hover_key = None
        self.sink.push_map(None)
        return self.session

    def _build(self, session, entity, appearance, now):
        if session.is_failed:
            self.status = STATUS_NO_COLLISION
            return
        if session.build is None and not session.begin(entity, screen_size(), self.settings.get('detail')):
            self.status = STATUS_WAITING
            return
        build = session.build
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
        self.sink.push_map(map_state(level, codes, self.mode, self.settings.get('opacity')))

    def _hover(self, session, appearance):
        key = (self.cursor, id(session), self.mode, id(self.attack))
        if self.cursor is None or key == self.hover_key:
            return
        self.hover_key = key
        self.sink.push_hover(self._card(session, appearance))

    def _card(self, session, appearance):
        x, y = self.cursor
        if session.box is None or not session.box.contains(x, y):
            return None
        segment = screen_ray(*_clip(self.cursor))
        if segment is None:
            return None

        started = default_timer()
        plates = probe(appearance, *segment)
        elapsed_ms = (default_timer() - started) * 1000.0
        if self.timing.add(elapsed_ms, len(plates)):
            log(self.timing.summary())
        return readout(plates, self.mode, self.attack if self.mode == MODE_SHELL else None, self.translate)
