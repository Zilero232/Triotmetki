from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.compat import is_number
from .constants import DAMAGED_EFFECT, EFFECT_BY_OUTCOME, EFFECT_MODEL, SHELL_MODELS


def shell_model(shell):
    return SHELL_MODELS.get(shell)


def effect_model(outcome, damage=0):
    effect = EFFECT_BY_OUTCOME.get(outcome)
    if effect is None:
        return None
    if outcome == 'crit' and is_number(damage) and damage > 0:
        effect = DAMAGED_EFFECT
    return EFFECT_MODEL % effect


def along(point, direction, distance):
    length = math.sqrt(sum(value * value for value in direction))
    if length <= 0:
        return tuple(point)
    return tuple(start + value / length * distance for start, value in zip(point, direction))
