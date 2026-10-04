from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.compat import is_number
from .constants import MIN_COS


def plate_analysis(hit_angle_cos, nominal, uses_angle=True):
    """{'angle', 'armor', 'nominal'} of the first plate a shot met: the angle from the plate's normal in degrees and
    the armour along the shot (nominal / cos, before the shell's normalisation, which the hangar cannot know), or None
    without a plate."""
    if not is_number(hit_angle_cos) or not is_number(nominal) or nominal <= 0:
        return None
    cos = min(1.0, max(MIN_COS, abs(float(hit_angle_cos))))
    angle = round(math.degrees(math.acos(cos)), 1)
    effective = nominal / cos if uses_angle else nominal
    return {'angle': angle, 'armor': int(round(effective)), 'nominal': int(round(nominal))}


def first_plate(layers):
    """The analysis of the first armoured layer of `layers` [(hit_angle_cos, nominal, uses_angle)], in the order the
    shot met them, or None."""
    for hit_angle_cos, nominal, uses_angle in layers or ():
        found = plate_analysis(hit_angle_cos, nominal, uses_angle)
        if found is not None:
            return found
    return None
