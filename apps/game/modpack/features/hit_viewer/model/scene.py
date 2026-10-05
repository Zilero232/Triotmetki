from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.compat import is_number
from .constants import DAMAGED_EFFECT, EFFECT_BY_OUTCOME, EFFECT_MODEL, SHELL_MODELS


def shell_model(shell):
    """The in-game path of the shell model drawn along the selected hit, or None for a shell without one."""
    return SHELL_MODELS.get(shell)


def effect_model(outcome, damage=0):
    """The in-game path of the outcome marker drawn where the selected hit landed, or None."""
    effect = EFFECT_BY_OUTCOME.get(outcome)
    if effect is None:
        return None
    if outcome == 'crit' and is_number(damage) and damage > 0:
        effect = DAMAGED_EFFECT
    return EFFECT_MODEL % effect


def along(point, direction, distance):
    """The point `distance` metres along `direction` from `point` (negative: back along the shell's path)."""
    length = math.sqrt(sum(value * value for value in direction))
    if length <= 0:
        return tuple(point)
    return tuple(start + value / length * distance for start, value in zip(point, direction))
