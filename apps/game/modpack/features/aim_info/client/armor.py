from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle import arena_dp, call, player
from ....core.client.game import client_attr, values_by_name
from ....core.compat import is_number
from ..model.armor import armor_readout, public_team
from .constants import (
    DISTANCE_FACTOR,
    DISTANCE_FACTOR_MODULE,
    PIERCE_FACTOR,
    RESOLVER_COLLISIONS,
    RESOLVER_FACTORY,
    RESOLVER_MODULE,
    RESOLVER_PIERCING,
    RESOLVER_PLATE,
    RESOLVER_RICOCHET,
    RESOLVER_STEPS,
    RESOLVER_VERDICT,
    SHOT_RESULT_CLASS,
    SHOT_RESULT_MODULE,
    SHOT_RESULTS,
    VEHICLE_CLASS,
    VEHICLE_MODULE,
)


def _distance(hit_point):
    own = call(player(), 'getOwnVehiclePosition')
    if hit_point is None or own is None:
        return None
    try:
        return (hit_point - own).length
    except Exception:  # a position of another shape (the checks): the piercing at the distance is left out
        return None


def own_team():
    team = call(arena_dp(), 'getNumberOfTeam')
    return team if team is not None else getattr(player(), 'team', None)


class ArmorReader(object):
    """The client's own shot-result resolution of the vehicle under the reticle, as the numbers behind the marker
    colour. `read(position, direction, collision, piercing_multiplier)` is a readout (`model.armor.armor_readout`) or
    None: no resolver, no vehicle, a wreck, an own-team vehicle or an undefined verdict."""

    def __init__(self):
        factory = client_attr(RESOLVER_MODULE, RESOLVER_FACTORY)
        self.resolver = factory() if factory is not None else None
        self.verdicts = values_by_name(client_attr(SHOT_RESULT_MODULE, SHOT_RESULT_CLASS), SHOT_RESULTS)
        self.distance_factor = client_attr(DISTANCE_FACTOR_MODULE, DISTANCE_FACTOR)
        self.vehicle_class = client_attr(VEHICLE_MODULE, VEHICLE_CLASS)

    def available(self):
        if self.resolver is None or not self.verdicts or self.vehicle_class is None:
            return False
        return all(getattr(self.resolver, step, None) is not None for step in RESOLVER_STEPS)

    def target(self, collision):
        """The vehicle a resolution is about, or None: only a live vehicle of another team."""
        entity = getattr(collision, 'entity', None)
        if entity is None or not isinstance(entity, self.vehicle_class):
            return None
        if getattr(entity, 'health', 0) <= 0:
            return None
        team = public_team(getattr(entity, 'publicInfo', None))
        if team is None or team == own_team():
            return None
        return entity

    def read(self, position, direction, collision, piercing_multiplier):
        entity = self.target(collision)
        if entity is None:
            return None
        descriptor = call(player(), 'getVehicleDescriptor')
        shot = getattr(descriptor, 'shot', None)
        shell = getattr(shot, 'shell', None)
        if shell is None:
            return None
        result = getattr(self.resolver, RESOLVER_VERDICT)(
            position, collision, direction, excludeTeam=own_team(), piercingMultiplier=piercing_multiplier,
        )
        verdict = self.verdicts.get(result)
        if verdict is None:
            return None
        distance = _distance(position)
        piercing = self._piercing(shot, shell, distance, piercing_multiplier)
        details = getattr(self.resolver, RESOLVER_COLLISIONS)(position, direction, entity)
        return armor_readout(self._layers(shell, details or ()), piercing, verdict)

    def _piercing(self, shot, shell, distance, piercing_multiplier):
        if not is_number(distance):
            return None
        power = getattr(self.resolver, RESOLVER_PIERCING)(
            shot.piercingPower, distance, getattr(shot, 'maxDistance', 0.0), piercing_multiplier,
        )
        if self.distance_factor is not None:
            power *= self.distance_factor(shell, distance, PIERCE_FACTOR)
        return power

    def _layers(self, shell, details):
        layers = []
        seen = set()
        for detail in details:
            material = getattr(detail, 'matInfo', None)
            if material is None or getattr(material, 'armor', None) is None:
                continue
            key = (getattr(detail, 'compName', None), getattr(material, 'kind', None))
            if key in seen:
                continue
            if getattr(material, 'collideOnceOnly', False):
                seen.add(key)
            layers.append(self._layer(shell, detail, material))
        return layers

    def _layer(self, shell, detail, material):
        angle_cos = detail.hitAngleCos if getattr(material, 'useHitAngle', True) else 1.0
        return {
            'armor': material.armor,
            'effective': getattr(self.resolver, RESOLVER_PLATE)(shell, angle_cos, material),
            'damaging': bool(getattr(material, 'vehicleDamageFactor', 0)),
            'ricochet': bool(getattr(self.resolver, RESOLVER_RICOCHET)(shell, angle_cos, material)),
            'angle_cos': angle_cos,
        }
