from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.compat import is_number
from .constants import MIN_COS, NORMALIZATION_DEG, OVERMATCH_FACTOR, OVERMATCH_RATIO


def normalization(shell, caliber, nominal):
    """The degrees the shell turns towards the plate's normal: its kind's standard value, widened when the calibre
    over-matches the plate."""
    base = NORMALIZATION_DEG.get(shell, 0.0)
    if not base or not is_number(caliber) or caliber <= OVERMATCH_RATIO * nominal:
        return base
    return base * OVERMATCH_FACTOR * caliber / (OVERMATCH_RATIO * nominal)


def _clamped_cos(value):
    return min(1.0, max(MIN_COS, abs(float(value))))


def plate_analysis(hit_angle_cos, nominal, uses_angle=True, shell=None, caliber=None):
    """{'angle', 'armor', 'nominal'} of the first plate a shot met: the angle from the plate's normal in degrees, the
    nominal armour and the effective armour the shell met (nominal / cos of the angle left after the shell's
    normalisation), or None without a plate."""
    if not is_number(hit_angle_cos) or not is_number(nominal) or nominal <= 0:
        return None
    angle = math.degrees(math.acos(_clamped_cos(hit_angle_cos)))
    effective = nominal
    if uses_angle:
        normalized = max(0.0, angle - normalization(shell, caliber, nominal))
        effective = nominal / _clamped_cos(math.cos(math.radians(normalized)))
    return {'angle': round(angle, 1), 'armor': int(round(effective)), 'nominal': int(round(nominal))}


def first_plate(layers, shell=None, caliber=None):
    """The analysis of the first armoured layer of `layers` [(hit_angle_cos, nominal, uses_angle)], in the order the
    shot met them, or None."""
    for hit_angle_cos, nominal, uses_angle in layers or ():
        found = plate_analysis(hit_angle_cos, nominal, uses_angle, shell, caliber)
        if found is not None:
            return found
    return None
