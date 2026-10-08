from __future__ import absolute_import, division, print_function, unicode_literals

from timeit import default_timer

from ....core.client.armor import bounds_on_screen, probe, screen_ray
from ..model import GridBuild, levels_for, screen_box
from .constants import EMPTY_RETRIES, EMPTY_RETRY_S, MAX_RAYS_PER_TICK, RAY_CHUNK, SETTLE_S, TICK_BUDGET_S


def cast_cell(appearance, level, index):
    clip_x, clip_y = level.clip(index)
    segment = screen_ray(clip_x, clip_y)
    if segment is None:
        return []
    start, end = segment
    return probe(appearance, start, end)


def _finest_cells(levels):
    if not levels:
        return 'no cells'
    finest = levels[-1]
    return '%dx%d cells of %d px' % (finest.cols, finest.rows, finest.cell_px)


class MapSession(object):

    def __init__(self, vehicle, label, pose, now):
        self.vehicle = vehicle
        self.label = label
        self.pose = pose
        self.started_at = now
        self.build = None
        self.box = None
        self.rays = 0
        self.work_s = 0.0
        self.ticks = 0
        self.retries = 0
        self.retry_at = None
        self.is_failed = False

    def is_settling(self, now):
        return now - self.started_at < SETTLE_S

    def is_waiting(self, now):
        return self.retry_at is not None and now < self.retry_at

    def begin(self, entity, screen, detail):
        self.box = screen_box(bounds_on_screen(entity))
        if self.box is None or screen is None:
            return False
        self.build = GridBuild(levels_for(self.box, screen, detail))
        self.retry_at = None
        return True

    def cast(self, appearance, code_of):
        started = default_timer()
        cast = 0
        level = self.build.level

        while cast < MAX_RAYS_PER_TICK and default_timer() - started < TICK_BUDGET_S:
            cells = self.build.next_cells(RAY_CHUNK)
            if not cells:
                break
            for index in cells:
                plates = cast_cell(appearance, level, index)
                self.build.record(index, code_of(plates), plates)
            cast += len(cells)

        self.rays += cast
        self.work_s += default_timer() - started
        self.ticks += 1
        return cast

    def retry_empty(self, now):
        if self.retries >= EMPTY_RETRIES:
            return False
        self.retries += 1
        self.build = None
        self.retry_at = now + EMPTY_RETRY_S
        return True

    def give_up(self):
        self.is_failed = True
        self.retry_at = None

    def summary(self):
        levels = self.build.levels if self.build is not None else ()
        cells = _finest_cells(levels)
        return 'armor view: %s: %d rays in %d ms over %d ticks (%d levels, %s)' % (
            self.label, self.rays, int(round(self.work_s * 1000)), self.ticks, len(levels), cells,
        )
