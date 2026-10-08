from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ..compat import clamp, is_int, is_number
from ..vendor import attr
from .constants import (
    KIND_MAIN,
    KIND_SPACED,
    MAX_EFFECTIVE_MM,
    MIN_HIT_COS,
    PART_NAMES,
    PART_TRACK,
    SPACED_KIND_BY_PART,
)


@attr.s(frozen=True)
class Plate(object):
    """One armour plate a ray crossed: `distance` along the ray (m), `hit_cos` (cosine of the angle from the plate's
    normal), the collision `part` name and `material_kind`, and the descriptor material's flags (RU 1.45
    items/vehicles._readMaterials): `armor` (mm), `is_spaced` (vehicleDamageFactor 0), `uses_angle` (useHitAngle),
    `may_ricochet`, `collides_once` (collideOnceOnly), `checks_ricochet_caliber` (checkCaliberForRichet, the client's
    spelling) and `checks_normalization_caliber` (checkCaliberForHitAngleNorm)."""

    distance = attr.ib()
    hit_cos = attr.ib()
    part = attr.ib()
    material_kind = attr.ib()
    armor = attr.ib()
    is_spaced = attr.ib(default=False)
    uses_angle = attr.ib(default=True)
    may_ricochet = attr.ib(default=True)
    collides_once = attr.ib(default=False)
    checks_ricochet_caliber = attr.ib(default=True)
    checks_normalization_caliber = attr.ib(default=True)

    @property
    def kind(self):
        if not self.is_spaced:
            return KIND_MAIN
        return SPACED_KIND_BY_PART.get(self.part, KIND_SPACED)

    @property
    def angle(self):
        """The angle from the plate's normal in degrees."""
        return math.degrees(math.acos(clamp(self.hit_cos, 0.0, 1.0)))

    @property
    def effective(self):
        """The armour along the ray: nominal / cos(angle) for a plate that uses the angle, capped at
        MAX_EFFECTIVE_MM."""
        if not self.uses_angle:
            return self.armor
        along = self.armor / max(self.hit_cos, MIN_HIT_COS)
        return min(along, MAX_EFFECTIVE_MM)


def part_name(part_index):
    """The part a collision index names: chassis, hull, turret, gun, or track (tracks and wheels past the four)."""
    if not is_int(part_index) or part_index < 0:
        return None
    if part_index < len(PART_NAMES):
        return PART_NAMES[part_index]
    return PART_TRACK


def _flag(material, name, default):
    return bool(getattr(material, name, default))


def plate_from(hit, material):
    """A Plate from one collideAllWorld hit `(distance, hit_cos, material_kind, part_index)` and the descriptor
    material it names, or None for a material without armour (a module, an unconfigured kind)."""
    distance, hit_cos, material_kind, part_index = hit
    armor = getattr(material, 'armor', None)
    if not is_number(armor) or not is_number(hit_cos):
        return None

    return Plate(
        distance=float(distance),
        hit_cos=clamp(abs(float(hit_cos)), 0.0, 1.0),
        part=part_name(part_index),
        material_kind=material_kind,
        armor=float(armor),
        is_spaced=not getattr(material, 'vehicleDamageFactor', 1.0),
        uses_angle=_flag(material, 'useHitAngle', True),
        may_ricochet=_flag(material, 'mayRicochet', True),
        collides_once=_flag(material, 'collideOnceOnly', False),
        checks_ricochet_caliber=_flag(material, 'checkCaliberForRichet', True),
        checks_normalization_caliber=_flag(material, 'checkCaliberForHitAngleNorm', True),
    )


def plates_along(hits, material_of):
    """The plates a ray crossed, nearest first: `hits` as collideAllWorld returns them, `material_of(part_index,
    material_kind)` the descriptor material or None. A material that collides once only counts once per part, as the
    client's shot result ignores it after the first hit (RU 1.45 gun_marker_ctrl ignoredMaterials)."""
    ordered = sorted(hits or (), key=lambda hit: hit[0])
    seen_once = set()
    plates = []

    for hit in ordered:
        plate = plate_from(hit, material_of(hit[3], hit[2]))
        if plate is None:
            continue
        key = (plate.part, plate.material_kind)
        if key in seen_once:
            continue
        if plate.collides_once:
            seen_once.add(key)
        plates.append(plate)
    return plates


def first_main(plates):
    """The index of the first plate that takes the hit (not spaced), or None."""
    for index, plate in enumerate(plates):
        if plate.kind == KIND_MAIN:
            return index
    return None


def up_to_main(plates):
    """The plates up to and including the first main one (all of them when there is none)."""
    index = first_main(plates)
    if index is None:
        return list(plates)
    return list(plates[:index + 1])
