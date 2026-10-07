from __future__ import absolute_import, division, print_function, unicode_literals

from .....core.compat import fraction, is_number
from .....core.hit_book import PART_CHASSIS, PART_HULL
from .constants import FIGURE, FIGURE_ORDER, MIDDLE, SHAPE_KEYS


def _fraction(value):
    if not is_number(value):
        return MIDDLE
    return fraction(float(value))


def _shape_and_across(part, x):
    if part != PART_CHASSIS:
        return (part if part in FIGURE else PART_HULL), x
    if x < MIDDLE:
        return 'chassis_left', x * 2
    return 'chassis_right', (x - MIDDLE) * 2


def figure_point(entry):
    z = _fraction(entry.get('z'))
    key, across = _shape_and_across(entry.get('part'), _fraction(entry.get('x')))
    left, top, width, height = FIGURE[key]
    return round(left + across * width, 3), round(top + (1.0 - z) * height, 3)


def figure_of(battle):
    shapes = [dict(zip(SHAPE_KEYS, FIGURE[key])) for key in FIGURE_ORDER]
    marks = []
    for entry in battle.get('hits') or []:
        x, y = figure_point(entry)
        marks.append({'x': x, 'y': y, 'tone': entry.get('outcome')})
    return {'shapes': shapes, 'marks': marks}
