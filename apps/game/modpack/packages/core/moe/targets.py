from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ..compat import clamp, is_number
from ..vendor import attr
from .constants import MARK_LEVELS, MAX_PERCENT, TARGET_LEVELS
from .curve import next_level
from .ema import battles_to_reach, project_moving_avg, required_battle_damage


def _remaining(moving_avg, target_avg, combined):
    return max(0, int(math.ceil(required_battle_damage(moving_avg, target_avg) - combined - 1e-9)))


def _need_for_gain(curve, start_curve, gain, moving_avg, combined):
    if gain <= 0 or start_curve + gain > curve.max_percent:
        return None
    return _remaining(moving_avg, curve.damage_for(start_curve + gain), combined)


def next_whole_percent(percent):
    level = int(math.floor(percent + 1e-9)) + 1
    return level if level <= MAX_PERCENT else None


def _clamp_percent(value):
    return round(clamp(value, 0.0, MAX_PERCENT), 2)


def _base_state(moving_avg, percent, combined, projected_avg, pace, step, marks):
    return {
        'percent': percent if is_number(percent) else None,
        'marks': marks if is_number(marks) else None,
        'damage': combined,
        'ema': int(round(moving_avg)),
        'ema_projected': int(round(projected_avg)),
        'projected': None,
        'delta': None,
        'next_level': None,
        'need_next': None,
        'need': {},
        'target_avg': {},
        'step': step,
        'step_need': None,
        'up_level': None,
        'up_need': None,
        'pace': int(round(pace)) if is_number(pace) else None,
        'battles': None,
        'has_curve': False,
    }


@attr.s(eq=False)
class _Battle(object):

    curve = attr.ib()
    moving_avg = attr.ib()
    combined = attr.ib()
    projected_avg = attr.ib()
    percent = attr.ib()
    start_curve = attr.ib(init=False)
    base = attr.ib(init=False)

    def __attrs_post_init__(self):
        self.start_curve = self.curve.percent_for(self.moving_avg)
        self.base = self.percent if is_number(self.percent) else self.start_curve

    def need_for_gain(self, gain):
        return _need_for_gain(self.curve, self.start_curve, gain, self.moving_avg, self.combined)


def _add_targets(state, battle):
    for level in TARGET_LEVELS:
        target_avg = battle.curve.damage_for(level)
        if target_avg is None:
            continue
        state['target_avg'][int(level)] = int(round(target_avg))
        if battle.base >= level:
            state['need'][int(level)] = 0
        else:
            state['need'][int(level)] = _remaining(battle.moving_avg, target_avg, battle.combined)


def _add_next_mark(state, battle, pace):
    level = next_level(battle.base, battle.curve, MARK_LEVELS)
    if level is None:
        return
    state['next_level'] = int(level)
    state['need_next'] = state['need'].get(int(level))
    state['battles'] = battles_to_reach(battle.projected_avg, battle.curve.damage_for(level), pace)


def _add_next_whole_percent(state, battle):
    up_level = next_whole_percent(battle.base)
    if up_level is None:
        return
    up_need = battle.need_for_gain(up_level - battle.base)
    if up_need is None:
        return
    state['up_level'] = up_level
    state['up_need'] = up_need


def moe_state(moving_avg, percent, combined=None, curve=None, pace=None, step=0.5, marks=None):
    """Everything a marks view shows about one tank, from the dossier at battle start (`moving_avg`,
    `percent`, `marks`), the combined damage dealt so far in this battle, the site curve and the pace.

    The projection keeps the dossier's percent and adds the curve's change (the curve and the dossier
    can disagree a little; the change is what the player earns in this battle). `need` holds, per target
    level, the combined damage still needed in this battle (0 once it is reached); `target_avg` the EMA each
    level needs. `step_need` is the damage for +`step` percent, `up_need` the damage for the next whole percent
    `up_level` (both from the curve's change, like the projection), `battles` the forecast at `pace` to the
    next mark after this battle. Outside a battle (`combined` None) nothing is projected and the needs are
    those of the next battle."""
    in_battle = is_number(combined)
    combined = max(0, int(combined)) if in_battle else 0
    projected_avg = project_moving_avg(moving_avg, combined) if in_battle else float(moving_avg)
    state = _base_state(moving_avg, percent, combined, projected_avg, pace, step, marks)
    if curve is None:
        return state

    battle = _Battle(curve, moving_avg, combined, projected_avg, percent)
    delta = curve.percent_for(projected_avg) - battle.start_curve
    state['has_curve'] = True
    state['projected'] = _clamp_percent(battle.base + delta)
    state['delta'] = round(state['projected'] - round(battle.base, 2), 2)

    _add_targets(state, battle)
    _add_next_mark(state, battle, pace)
    if is_number(step):
        state['step_need'] = battle.need_for_gain(step)
    _add_next_whole_percent(state, battle)
    return state
