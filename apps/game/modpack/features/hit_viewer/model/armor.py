from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.armor import Plate, Shell, normalized_cos
from ....core.armor import normalization as shell_normalization
from ....core.compat import clamp, is_number
from .constants import MIN_COS, SHELL_KINDS


# The shot rules are core.armor's (the client's reticle rules), one implementation with the hangar armour map.
def _shell(shell, caliber):
    caliber = float(caliber) if is_number(caliber) else 0.0
    return Shell(kind=SHELL_KINDS.get(shell), caliber=caliber, power_near=0.0, power_far=0.0, max_distance=0.0)


def _plate(hit_angle_cos, nominal, uses_angle):
    hit_cos = clamp(abs(float(hit_angle_cos)), MIN_COS, 1.0)
    return Plate(distance=0.0, hit_cos=hit_cos, part=None, material_kind=None, armor=float(nominal),
                 uses_angle=uses_angle)


def normalization(shell, caliber, nominal):
    return shell_normalization(_plate(1.0, nominal, True), _shell(shell, caliber))


def analysis(plate, shell=None, caliber=None):
    effective = plate.armor
    if plate.uses_angle:
        along_cos = clamp(normalized_cos(plate, _shell(shell, caliber)), MIN_COS, 1.0)
        effective = plate.armor / along_cos
    return {'angle': round(plate.angle, 1), 'armor': int(round(effective)), 'nominal': int(round(plate.armor))}


def plate_analysis(hit_angle_cos, nominal, uses_angle=True, shell=None, caliber=None):
    if not is_number(hit_angle_cos) or not is_number(nominal) or nominal <= 0:
        return None
    return analysis(_plate(hit_angle_cos, nominal, uses_angle), shell, caliber)


def first_plate(plates, shell=None, caliber=None):
    """The first plate with armour along a shot (core.armor Plates, nearest first), analysed for its shell."""
    for plate in plates or ():
        if plate.armor > 0:
            return analysis(plate, shell, caliber)
    return None
