from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ..compat import clamp, fraction
from ..vendor import attr
from .constants import (
    CHANCE_SIGMA_SHARE,
    FAR_DISTANCE_M,
    KIND_MAIN,
    MAX_HIT_ANGLE,
    MIN_HIT_COS,
    MM_PER_M,
    MODERN_HE_SHIELD_FACTOR,
    NEAR_DISTANCE_M,
    NORMALIZATION_CALIBERS,
    NORMALIZATION_FACTOR,
    OUTCOME_MAIN,
    OUTCOME_NO_MAIN,
    OUTCOME_RICOCHET,
    OUTCOME_STOPPED,
    OVERMATCH_CALIBERS,
    PENETRATION_RANDOMNESS,
    SHELL_RULES,
    VERDICT_ALWAYS,
    VERDICT_CHANCE,
    VERDICT_NEVER,
    VERDICT_NO_ARMOUR,
    VERDICT_RICOCHET,
)

INFINITE = float('inf')


@attr.s(frozen=True)
class Shell(object):
    """A shot as the gun descriptor has it: the shell `kind` (a constants.SHELL_TYPES name), `caliber` (mm), the
    penetration at 100 m and 500 m, the shot's range (m), and for a high-explosive shell whether it follows the modern
    mechanics and passes screens (shieldPenetration)."""

    kind = attr.ib()
    caliber = attr.ib()
    power_near = attr.ib()
    power_far = attr.ib()
    max_distance = attr.ib()
    is_modern_he = attr.ib(default=False)
    passes_screens = attr.ib(default=False)

    @property
    def rule(self):
        return SHELL_RULES.get(self.kind)


@attr.s(frozen=True)
class Step(object):
    """A plate on a shell's way: `armor` is the armour it counts against this shell (its penetration armour), `cost`
    what the shell spends on it, `loss` the HEAT jet's share kept before reaching it."""

    plate = attr.ib()
    armor = attr.ib()
    cost = attr.ib()
    loss = attr.ib(default=1.0)


@attr.s(frozen=True)
class Trace(object):
    """A shell's way through `steps`: `outcome` (main, ricochet, stopped, no_main) and the penetration it needs at the
    muzzle to get through the main plate (`needed`, None unless it reaches one)."""

    outcome = attr.ib()
    steps = attr.ib()
    needed = attr.ib(default=None)


@attr.s(frozen=True)
class Verdict(object):
    name = attr.ib()
    chance = attr.ib()


def power_at(shell, distance, distance_factor=1.0):
    """The shell's penetration at `distance` (m), as RU 1.45 gun_marker_ctrl._computePiercingPowerAtDistImpl reads
    it, times the shell's own distance factor (helpers_common.computeDistanceFactor)."""
    if distance <= NEAR_DISTANCE_M:
        return shell.power_near * distance_factor
    if distance >= shell.max_distance:
        return 0.0

    progress = (distance - NEAR_DISTANCE_M) / (FAR_DISTANCE_M - NEAR_DISTANCE_M)
    power = shell.power_near + (shell.power_far - shell.power_near) * progress
    return max(0.0, power) * distance_factor


def _ricochet_cos(shell):
    rule = shell.rule
    if rule is None or rule['ricochet'] is None:
        return None
    return math.cos(math.radians(rule['ricochet']))


def is_overmatched(plate, shell):
    """Whether the calibre is over three times the plate (the 3-calibre rule: no ricochet)."""
    rule = shell.rule
    if rule is None or not rule['caliber_ricochet'] or not plate.checks_ricochet_caliber:
        return False
    return plate.armor * OVERMATCH_CALIBERS < shell.caliber


def ricochets(plate, shell):
    """RU 1.45 gun_marker_ctrl._CrosshairShotResults._shouldRicochet."""
    ricochet_cos = _ricochet_cos(shell)
    if ricochet_cos is None or not plate.may_ricochet or plate.armor == 0:
        return False
    if plate.hit_cos > ricochet_cos:
        return False
    return not is_overmatched(plate, shell)


def normalization(plate, shell):
    """The shell's normalisation against the plate in degrees, widened by 1.4 * calibre / (2 * armour) past two
    calibres (RU 1.45 _computePenetrationArmor)."""
    rule = shell.rule
    base = rule['normalization'] if rule is not None else 0.0
    if base <= 0:
        return 0.0

    double_armor = plate.armor * NORMALIZATION_CALIBERS
    is_widened = plate.checks_normalization_caliber and shell.caliber > double_armor > 0
    if not is_widened:
        return base
    return base * NORMALIZATION_FACTOR * shell.caliber / double_armor


def normalized_cos(plate, shell):
    """The cosine of the angle left after the shell turned towards the plate's normal."""
    hit_cos = plate.hit_cos
    turn = math.radians(normalization(plate, shell))
    if turn <= 0 or hit_cos >= 1.0:
        return hit_cos

    angle = math.acos(clamp(hit_cos, 0.0, 1.0)) - turn
    if angle < 0:
        return 1.0
    return math.cos(min(angle, MAX_HIT_ANGLE))


def penetration_armor(plate, shell):
    """The armour the plate counts against the shell (RU 1.45 _computePenetrationArmor)."""
    if not plate.uses_angle:
        return plate.armor
    return plate.armor / max(normalized_cos(plate, shell), MIN_HIT_COS)


def _jet_loss(plate, jet_start, rule):
    if jet_start is None:
        return 1.0
    gap = plate.distance - jet_start
    if gap <= 0:
        return 1.0
    return max(0.0, 1.0 - gap * rule['jet_loss_per_m'])


def _screen_cost(armor, shell):
    if not shell.is_modern_he:
        return armor
    if not shell.passes_screens:
        return None
    return armor * MODERN_HE_SHIELD_FACTOR


def needed_power(steps):
    """The penetration a shell needs at the muzzle to get through the last step: back from the main plate, each
    jet loss divides it and each screen adds what it costs."""
    needed = 0.0
    for step in reversed(steps):
        if step.loss <= 0:
            return INFINITE
        needed = (needed + step.cost) / step.loss
    return needed


def _jet_start(plate, shell, jet_start):
    if shell.rule['jet_loss_per_m'] <= 0:
        return jet_start
    return plate.distance + plate.armor / MM_PER_M


def trace(plates, shell):
    """The shell's way through `plates` (nearest first) as RU 1.45 gun_marker_ctrl._CrosshairShotResults
    .__shotResultDefault / __shotResultModernHE walk it: a ricochet ends it (only before a HEAT jet forms), a screen
    costs its penetration armour (three times it for a modern HE shell, which a screen stops without
    shieldPenetration), a HEAT jet loses 50 % per metre between plates, and the first main plate decides."""
    if shell.rule is None:
        return Trace(OUTCOME_NO_MAIN, ())
    steps = []
    jet_start = None

    for plate in plates:
        loss = _jet_loss(plate, jet_start, shell.rule)
        armor = penetration_armor(plate, shell)
        if jet_start is None and ricochets(plate, shell):
            steps.append(Step(plate, armor, armor, loss))
            return Trace(OUTCOME_RICOCHET, tuple(steps))
        if plate.kind == KIND_MAIN:
            steps.append(Step(plate, armor, armor, loss))
            return Trace(OUTCOME_MAIN, tuple(steps), needed_power(steps))
        cost = _screen_cost(armor, shell)
        if cost is None:
            steps.append(Step(plate, armor, armor, loss))
            return Trace(OUTCOME_STOPPED, tuple(steps))
        steps.append(Step(plate, armor, cost, loss))
        jet_start = _jet_start(plate, shell, jet_start)

    return Trace(OUTCOME_NO_MAIN, tuple(steps))


def _normal_cdf(value):
    return 0.5 * (1.0 + math.erf(value / math.sqrt(2.0)))


def roll_chance(threshold, randomness=PENETRATION_RANDOMNESS):
    """The chance a roll in [1 - randomness, 1 + randomness] reaches `threshold` (needed / penetration): a normal
    distribution with sigma = CHANCE_SIGMA_SHARE of the band, cut at its edges."""
    shortfall = threshold - 1.0
    if shortfall <= -randomness:
        return 1.0
    if shortfall > randomness:
        return 0.0

    sigma = randomness * CHANCE_SIGMA_SHARE
    low = _normal_cdf(-randomness / sigma)
    high = _normal_cdf(randomness / sigma)
    reached = high - _normal_cdf(shortfall / sigma)
    return fraction(reached / (high - low))


def _main_verdict(needed, power, randomness):
    if power <= 0 or needed == INFINITE:
        return Verdict(VERDICT_NEVER, 0.0)
    if power * (1.0 - randomness) >= needed:
        return Verdict(VERDICT_ALWAYS, 1.0)
    if power * (1.0 + randomness) < needed:
        return Verdict(VERDICT_NEVER, 0.0)
    return Verdict(VERDICT_CHANCE, roll_chance(needed / power, randomness))


_FIXED_VERDICTS = {
    OUTCOME_RICOCHET: Verdict(VERDICT_RICOCHET, 0.0),
    OUTCOME_STOPPED: Verdict(VERDICT_NEVER, 0.0),
    OUTCOME_NO_MAIN: Verdict(VERDICT_NO_ARMOUR, 0.0),
}


def verdict(shell_trace, power, randomness=PENETRATION_RANDOMNESS):
    """Always, chance (with the roll's chance), never, ricochet, or no_armour (the ray meets no main plate)."""
    fixed = _FIXED_VERDICTS.get(shell_trace.outcome)
    if fixed is not None:
        return fixed
    return _main_verdict(shell_trace.needed, power, randomness)
