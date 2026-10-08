"""The client side of `core.armor`: the plates along a ray through the hangar vehicle's collision.

The hangar vehicle (own or previewed) is the client's `HangarVehicleAppearance`: its `collisions`
(`BigWorld.CollisionComponent`, built from the four parts' collision models) answer `collideAllWorld(start, end)` with
`(distance, hitAngleCos, matKind, partIndex)` per hit, and its `typeDescriptor` names each part's materials (RU 1.45
Vehicle.collideSegmentExt / getMatinfo do the same in battle). Nothing here is kept between calls: a vehicle swap
destroys the collision, so every reader takes the appearance it is given and reads it again.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ...armor import plates_along
from ...log import guarded
from ..game import client_attr
from .constants import MATERIAL_PARTS, TRACK_MODULE, TRACK_PAIR_NAME


def _common_material(material_kind):
    from items import vehicles
    return vehicles.g_cache.commonConfig['materials'].get(material_kind)


def _track_material(descriptor, part_index, material_kind):
    pair_of = client_attr(TRACK_MODULE, TRACK_PAIR_NAME)
    if pair_of is None:
        return None
    pair = pair_of(part_index, descriptor)
    if pair is None:
        return None
    return descriptor.chassis.tracks[pair].materials.get(material_kind)


def _wheel_material(descriptor, collisions, part_index):
    wheel = collisions.getPartName(part_index)
    if wheel is None:
        return None
    return descriptor.chassis.wheelsArmor.get(wheel, None)


def _extra_material(descriptor, collisions, part_index, material_kind):
    found = _track_material(descriptor, part_index, material_kind)
    if found is not None:
        return found
    if getattr(descriptor, 'isWheeledVehicle', False):
        return _wheel_material(descriptor, collisions, part_index)
    return None


@guarded('armor: material')
def material(descriptor, collisions, part_index, material_kind):
    """The descriptor material a hit names, in the order RU 1.45 Vehicle.getMatinfo looks: the part's own materials,
    a track pair's, a wheel's, then the common materials."""
    found = None
    if 0 <= part_index < len(MATERIAL_PARTS):
        part = getattr(descriptor, MATERIAL_PARTS[part_index])
        found = part.materials.get(material_kind)
    elif part_index > len(MATERIAL_PARTS):
        found = _extra_material(descriptor, collisions, part_index, material_kind)

    if found is None:
        found = _common_material(material_kind)
    return found


def probe(appearance, start, end):
    """The plates between `start` and `end` (world points) through the appearance's collision, nearest first; an
    empty list when the ray misses or the collision is gone."""
    collisions = getattr(appearance, 'collisions', None)
    if collisions is None:
        return []
    hits = collisions.collideAllWorld(start, end)
    if not hits:
        return []

    descriptor = appearance.typeDescriptor

    def material_of(part_index, material_kind):
        return material(descriptor, collisions, part_index, material_kind)

    return plates_along(hits, material_of)
