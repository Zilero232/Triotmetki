# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.compat import is_number
from .constants import FAILED, MAIN_GUN_GUI_TYPES, MIN_DAMAGE, MIN_SHARE_OF_ENEMY_HP, PROGRESS, REACHED, UNREACHABLE

# Fair play: own damage, enemy HP as the stock score strip shows it, the client's ally-hit message.


def main_gun_applies(gui_type):
    return gui_type is None or gui_type in MAIN_GUN_GUI_TYPES


def threshold(enemy_max):
    if not is_number(enemy_max) or enemy_max <= 0:
        return MIN_DAMAGE
    return max(MIN_DAMAGE, int(math.ceil(MIN_SHARE_OF_ENEMY_HP * enemy_max)))


# Fair play: an unseen enemy keeps its last known HP, so out of reach is shown only on proof.
def medal_status(damage, need, remaining, hit_ally, is_alive=True):
    if hit_ally:
        return FAILED
    if damage >= need:
        return REACHED
    if not is_alive or remaining < need - damage:
        return UNREACHABLE
    return PROGRESS


def main_gun_state(own_damage, enemies_max, enemies_hp, hit_ally=False, is_alive=True):
    damage = int(own_damage or 0)
    need = threshold(enemies_max)
    remaining = max(0, int(enemies_hp or 0))
    team = max(damage, int(enemies_max or 0) - remaining)
    share = int(round(100.0 * damage / team)) if team > 0 else 0

    return {
        'damage': damage,
        'need': need,
        'remaining': remaining,
        'team': team,
        'share': share,
        'status': medal_status(damage, need, remaining, hit_ally, is_alive),
    }
