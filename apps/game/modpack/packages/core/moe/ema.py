from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ..compat import is_number
from .constants import EMA_K, MAX_BATTLE_CHANGE, MAX_FORECAST_BATTLES


def combined_damage(damage, radio, track, stun):
    return damage + max(radio, track, stun)


def project_moving_avg(moving_avg, battle_combined):
    return EMA_K * battle_combined + (1.0 - EMA_K) * moving_avg


def required_battle_damage(moving_avg, target_avg):
    return max(0.0, (target_avg - (1.0 - EMA_K) * moving_avg) / EMA_K)


def rating_to_percent(damage_rating):
    return round(damage_rating / 100.0, 2) if is_number(damage_rating) else None


# The client keeps damageRating as the percent times 100.
def rating_change(rating_before, rating_after):
    if not (is_number(rating_before) and is_number(rating_after)) or rating_before <= 0 or rating_after <= 0:
        return None
    if abs(rating_after - rating_before) > MAX_BATTLE_CHANGE:
        return None
    return round((rating_after - rating_before) / 100.0, 2)


def battles_to_reach(moving_avg, target_avg, pace):
    if not (is_number(moving_avg) and is_number(target_avg)):
        return None
    if moving_avg >= target_avg:
        return 0
    if not is_number(pace) or pace <= target_avg:
        return None
    battles = int(math.ceil(math.log((pace - target_avg) / (pace - moving_avg)) / math.log(1.0 - EMA_K) - 1e-9))
    return battles if 0 < battles <= MAX_FORECAST_BATTLES else None
