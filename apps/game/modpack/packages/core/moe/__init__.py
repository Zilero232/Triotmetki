"""Marks-of-excellence maths shared by the in-battle panel and the hangar view (pure, Python 2/3).

- `ema`: the client's metric (damage + best assist, 100-battle EMA), its inverse and the forecast;
- `curve`: `ThresholdCurve`, the site's damage-for-percent curve of a tank, and `estimated_curve` until it has one;
- `pace`: `PaceBook`, the combined damage of the player's last own battles per tank;
- `targets`: `moe_state`, every value a marks view shows;
- `macros`: `moe_macros` (the state as template text) and `moe_color` (the colour ramp);
- `cache`: `ThresholdCache`, the curves per tank with their read time;
- `mastery`: the mastery badges' XP per battle from the same answer;
- `results`: the battle results' damageRating (a whole percent) in the dossier's hundredths, and its checks.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from .cache import ThresholdCache
from .constants import (
    COLOR_MODE_DELTA,
    COLOR_MODE_MARK,
    COLOR_MODE_OFF,
    COLOR_MODES,
    EMA_K,
    EMA_WINDOW,
    MARK_LEVELS,
    MASTERY_CLASSES,
    TARGET_LEVELS,
)
from .curve import ThresholdCurve, estimated_curve, next_level, threshold_problem
from .macros import moe_color, moe_macros
from .mastery import mastery_from_api, mastery_state
from .ema import (
    battles_to_reach,
    combined_damage,
    project_moving_avg,
    rating_change,
    rating_to_percent,
    required_battle_damage,
)
from .pace import PaceBook, battle_combined
from .results import exact_moe, implausible_change, is_post_battle_reading, is_rating, results_rating
from .targets import moe_state, next_whole_percent

__all__ = (
    'COLOR_MODE_DELTA',
    'COLOR_MODE_MARK',
    'COLOR_MODE_OFF',
    'COLOR_MODES',
    'EMA_K',
    'EMA_WINDOW',
    'MARK_LEVELS',
    'MASTERY_CLASSES',
    'PaceBook',
    'TARGET_LEVELS',
    'ThresholdCache',
    'ThresholdCurve',
    'battle_combined',
    'battles_to_reach',
    'combined_damage',
    'estimated_curve',
    'exact_moe',
    'implausible_change',
    'is_post_battle_reading',
    'is_rating',
    'mastery_from_api',
    'mastery_state',
    'moe_color',
    'moe_macros',
    'moe_state',
    'next_level',
    'next_whole_percent',
    'project_moving_avg',
    'rating_change',
    'rating_to_percent',
    'threshold_problem',
    'required_battle_damage',
    'results_rating',
)
