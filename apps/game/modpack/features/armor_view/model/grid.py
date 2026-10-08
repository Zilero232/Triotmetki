from __future__ import absolute_import, division, print_function, unicode_literals

import math
from collections import deque

from ....core.compat import fraction
from ....core.vendor import attr
from .constants import BOX_MARGIN, DESIGN_HEIGHT, DETAIL_CELLS, DETAIL_MEDIUM, MAX_CELLS, MIN_CELL_PX, TONE_EMPTY

NEIGHBOURS = tuple((dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1))


@attr.s(frozen=True)
class Box(object):
    left = attr.ib()
    top = attr.ib()
    right = attr.ib()
    bottom = attr.ib()

    @property
    def width(self):
        return self.right - self.left

    @property
    def height(self):
        return self.bottom - self.top

    def contains(self, x, y):
        is_inside_x = self.left <= x <= self.right
        is_inside_y = self.top <= y <= self.bottom
        return is_inside_x and is_inside_y


def screen_fraction(clip_x, clip_y):
    """A clip-space point (-1..1, y up) as fractions of the screen from its top left."""
    return (clip_x + 1.0) / 2.0, (1.0 - clip_y) / 2.0


def screen_box(clip_points, margin=BOX_MARGIN):
    """The screen box (fractions) around the projected points, widened by `margin` of its size on each side and held
    on the screen; None when nothing of it is on the screen."""
    if not clip_points:
        return None
    points = [screen_fraction(x, y) for x, y in clip_points]
    xs = [x for x, _ in points]
    ys = [y for _, y in points]

    pad_x = (max(xs) - min(xs)) * margin
    pad_y = (max(ys) - min(ys)) * margin
    box = Box(
        left=fraction(min(xs) - pad_x),
        top=fraction(min(ys) - pad_y),
        right=fraction(max(xs) + pad_x),
        bottom=fraction(max(ys) + pad_y),
    )
    if box.width <= 0 or box.height <= 0:
        return None
    return box


@attr.s(frozen=True)
class Level(object):
    """One grid over `box`: `cols` x `rows` cells of `cell_px` screen pixels, row by row from the top left."""

    box = attr.ib()
    cols = attr.ib()
    rows = attr.ib()
    cell_px = attr.ib()

    @property
    def size(self):
        return self.cols * self.rows

    def centre(self, index):
        """The cell's centre as screen fractions."""
        row, col = divmod(index, self.cols)
        x = self.box.left + (col + 0.5) * self.box.width / self.cols
        y = self.box.top + (row + 0.5) * self.box.height / self.rows
        return x, y

    def clip(self, index):
        """The cell's centre in clip space (-1..1, y up)."""
        x, y = self.centre(index)
        return x * 2.0 - 1.0, 1.0 - y * 2.0

    def cell_at(self, x, y):
        """The cell under the screen fractions `(x, y)`, or None outside the box."""
        if not self.box.contains(x, y):
            return None
        col = min(self.cols - 1, int((x - self.box.left) / self.box.width * self.cols))
        row = min(self.rows - 1, int((y - self.box.top) / self.box.height * self.rows))
        return row * self.cols + col


def level_of(box, screen, cell_px):
    """The level of `cell_px` design pixels (of a DESIGN_HEIGHT-high screen) over `box` on a `screen` of
    (width, height) pixels."""
    width, height = screen
    size = max(MIN_CELL_PX, cell_px * height / DESIGN_HEIGHT)
    cols = max(1, int(math.ceil(box.width * width / size)))
    rows = max(1, int(math.ceil(box.height * height / size)))
    return Level(box=box, cols=cols, rows=rows, cell_px=cell_px)


def levels_for(box, screen, detail):
    """The coarse-to-fine levels of `detail` over `box`, without any past MAX_CELLS cells."""
    sizes = DETAIL_CELLS.get(detail, DETAIL_CELLS[DETAIL_MEDIUM])
    levels = [level_of(box, screen, cell_px) for cell_px in sizes]
    return [level for level in levels if level.size <= MAX_CELLS]


def _hot_cells(level, codes):
    hot = set()
    for index, code in enumerate(codes):
        if code == TONE_EMPTY:
            continue
        row, col = divmod(index, level.cols)
        for dx, dy in NEIGHBOURS:
            hot.add((col + dx, row + dy))
    return hot


def cells_near(level, coarse, coarse_codes):
    """The cells of `level` whose centre falls in a cell of the `coarse` level that found armour, or next to one:
    the rest of the screen box is outside the tank."""
    hot = _hot_cells(coarse, coarse_codes)
    near = []

    for index in range(level.size):
        x, y = level.centre(index)
        coarse_index = coarse.cell_at(x, y)
        if coarse_index is None:
            continue
        row, col = divmod(coarse_index, coarse.cols)
        if (col, row) in hot:
            near.append(index)
    return near


class GridBuild(object):
    """The rays of one map, level by level: `next_cells(limit)` hands out the cells to cast, `record(index, code,
    plates)` takes each result, `finish_level()` returns the finished `(level, codes)` and starts the next one, and
    `recode(code_of)` draws the cells again from their plates (another mode or shell) without casting a ray."""

    def __init__(self, levels):
        self.levels = list(levels)
        self.level_index = 0
        self.previous = None
        self.codes = []
        self.plates = []
        self.queue = deque()
        self.cast = 0
        if self.levels:
            self._start_level()

    @property
    def level(self):
        return self.levels[self.level_index]

    @property
    def is_done(self):
        return self.level_index >= len(self.levels)

    @property
    def is_level_done(self):
        return not self.is_done and not self.queue

    @property
    def progress(self):
        if self.is_done or not self.levels:
            return 1.0
        size = max(1, self.level.size)
        left = len(self.queue) / size
        return (self.level_index + 1.0 - left) / len(self.levels)

    def _start_level(self):
        level = self.level
        self.codes = [TONE_EMPTY] * level.size
        self.plates = [None] * level.size
        if self.previous is None:
            self.queue = deque(range(level.size))
            return
        coarse, coarse_codes, _ = self.previous
        self.queue = deque(cells_near(level, coarse, coarse_codes))

    def next_cells(self, limit):
        taken = []
        while self.queue and len(taken) < limit:
            taken.append(self.queue.popleft())
        return taken

    def record(self, index, code, plates=None):
        self.codes[index] = code
        self.plates[index] = plates
        self.cast += 1

    def found_armour(self):
        return any(code != TONE_EMPTY for code in self.codes)

    def finish_level(self):
        finished = (self.level, list(self.codes), list(self.plates))
        self.previous = finished
        self.level_index += 1
        if not self.is_done:
            self._start_level()
        return finished[0], finished[1]

    def finished(self):
        """The last finished `(level, codes)`, or None before the first."""
        if self.previous is None:
            return None
        return self.previous[0], self.previous[1]

    def recode(self, code_of):
        """Draw the finished level's cells and the cells cast so far again with `code_of(plates)`."""
        if self.previous is not None:
            level, _, plates = self.previous
            self.previous = (level, [_code(code_of, cell) for cell in plates], plates)
        if not self.is_done:
            self.codes = [_code(code_of, cell) for cell in self.plates]


def _code(code_of, plates):
    if not plates:
        return TONE_EMPTY
    return code_of(plates)
