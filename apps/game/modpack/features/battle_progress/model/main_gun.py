# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.compat import is_number
from .constants import FAILED, MAIN_GUN_GUI_TYPES, MIN_DAMAGE, MIN_SHARE_OF_ENEMY_HP, PROGRESS, REACHED, UNREACHABLE

# Fair play: the own damage from the player's feedback, the enemy team's HP as the stock score strip shows it (max HP
# from the player panels' arena data, the HP left the client's BattleFieldCtrl counts), and whether an own shot hit an
# ally from the client's own «Попадание в союзника» message, never who. The team's damage is the HP the enemies lost,
# one number; who dealt it stays unknown, so the row never claims the medal: the server alone knows the team's top
# damage.


def main_gun_applies(gui_type):
    return gui_type is None or gui_type in MAIN_GUN_GUI_TYPES


def threshold(enemy_max):
    if not is_number(enemy_max) or enemy_max <= 0:
        return MIN_DAMAGE
    return max(MIN_DAMAGE, int(math.ceil(MIN_SHARE_OF_ENEMY_HP * enemy_max)))


# Out of reach only on proof: the enemies' known HP is never below what they really have (an unseen enemy keeps its
# last known HP), so less of it than the damage still needed cannot be made up.
def medal_status(damage, need, remaining, hit_ally):
    if hit_ally:
        return FAILED
    if damage >= need:
        return REACHED
    if remaining < need - damage:
        return UNREACHABLE
    return PROGRESS


def main_gun_state(own_damage, enemies_max, enemies_hp, hit_ally=False):
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
        'status': medal_status(damage, need, remaining, hit_ally),
    }
