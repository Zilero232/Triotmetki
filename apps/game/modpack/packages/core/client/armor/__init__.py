"""The client side of `core.armor`: the plates along a ray through the hangar vehicle's collision, the camera's screen
rays and the vehicle's bounds on the screen, and a gun's shots as `core.armor.Shell`s.

The hangar vehicle (own or previewed) is the client's `HangarVehicleAppearance`: its `collisions`
(`BigWorld.CollisionComponent`, built from the four parts' collision models) answer `collideAllWorld(start, end)` with
`(distance, hitAngleCos, matKind, partIndex)` per hit, and its `typeDescriptor` names each part's materials (RU 1.45
Vehicle.collideSegmentExt / getMatinfo do the same in battle). Nothing here is kept between calls: a vehicle swap
destroys the collision, so every reader takes the appearance it is given and reads it again.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ...armor import Shell, plates_along
from ...compat import is_number
from ...log import guarded
from ..game import client_attr
from ..hangar_preview import hangar_space
from .constants import (
    CAMERAS_MODULE,
    DISTANCE_FACTOR_MODULE,
    DISTANCE_FACTOR_NAME,
    MATERIAL_PARTS,
    MODERN_MECHANICS,
    PIERCE_FACTOR,
    PROJECT_NAME,
    RAY_LENGTH_M,
    RAY_NAME,
    TRACK_MODULE,
    TRACK_PAIR_NAME,
    UNIT_CORNERS,
)


@guarded('armor: hangar vehicle')
def hangar_vehicle_entity():
    """The hangar's vehicle entity (own or previewed tank), or None."""
    space = hangar_space()
    if space is None:
        return None
    return space.getVehicleEntity()


def _is_loaded(appearance):
    loaded = getattr(appearance, 'isLoaded', None)
    if callable(loaded):
        return bool(loaded())
    return bool(loaded)


@guarded('armor: hangar appearance')
def loaded_appearance(entity):
    """The entity's appearance once it reports itself loaded and has its collision, else None."""
    appearance = getattr(entity, 'appearance', None)
    if appearance is None or not _is_loaded(appearance):
        return None
    if getattr(appearance, 'collisions', None) is None:
        return None
    return appearance


@guarded('armor: vehicle identity')
def vehicle_key(entity, appearance):
    """What tells one loaded hangar vehicle from the next: the appearance object and the vehicle type."""
    descriptor = appearance.typeDescriptor
    return id(entity), id(appearance), descriptor.type.compactDescr


@guarded('armor: vehicle name', u'')
def vehicle_name(descriptor):
    return descriptor.type.shortUserString


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


@guarded('armor: camera pose')
def camera_pose():
    """The camera as `(position, forward, fov)` tuples, to tell whether it moved."""
    import BigWorld
    import Math
    inverse = Math.Matrix(BigWorld.camera().invViewMatrix)
    position = inverse.translation
    forward = inverse.applyToAxis(2)

    return (position.x, position.y, position.z), (forward.x, forward.y, forward.z), BigWorld.projection().fov


@guarded('armor: screen size')
def screen_size():
    import BigWorld
    width, height = BigWorld.screenSize()
    return int(width), int(height)


@guarded('armor: screen ray')
def screen_ray(clip_x, clip_y):
    """The world segment under the screen point `(clip_x, clip_y)` (-1..1, y up), from the near plane away from the
    camera (RU 1.45 AvatarInputHandler.cameras.getWorldRayAndPoint)."""
    ray_and_point = client_attr(CAMERAS_MODULE, RAY_NAME)
    if ray_and_point is None:
        return None
    direction, start = ray_and_point(clip_x, clip_y)
    direction.normalise()

    return start, start + direction * RAY_LENGTH_M


def _clip_point(project, point):
    clip = project(point)
    if clip is None or clip.w <= 0:
        return None
    return clip.x, clip.y


@guarded('armor: vehicle bounds', ())
def bounds_on_screen(entity):
    """The screen points (clip x, y) of the corners of the vehicle's four parts' world boxes; corners behind the
    camera are left out."""
    import Math
    project = client_attr(CAMERAS_MODULE, PROJECT_NAME)
    model = getattr(entity, 'model', None)
    if project is None or model is None:
        return ()
    points = []

    for part_index in range(len(MATERIAL_PARTS)):
        box = Math.Matrix(model.getBoundsForPart(part_index))
        for corner in UNIT_CORNERS:
            clip = _clip_point(project, box.applyPoint(corner))
            if clip is not None:
                points.append(clip)
    return tuple(points)


@guarded('armor: cursor')
def cursor_clip():
    """The mouse cursor in clip space (-1..1, y up), or None when the client has no cursor."""
    import GUI
    cursor = GUI.mcursor()
    if cursor is None:
        return None
    position = cursor.position
    return position.x, position.y


def _is_modern_he(shell):
    import constants
    shell_type = getattr(shell, 'type', None)
    mechanics = getattr(shell_type, 'mechanics', None)
    mechanics_types = getattr(constants, 'SHELL_MECHANICS_TYPE', None)
    modern = getattr(mechanics_types, MODERN_MECHANICS, None)
    return mechanics is not None and mechanics == modern


def _power(shot, index):
    value = shot.piercingPower[index]
    return float(value) if is_number(value) else 0.0


@guarded('armor: gun shot')
def shot_shell(shot):
    """One gun shot of a descriptor as a `core.armor.Shell`."""
    shell = shot.shell
    shell_type = getattr(shell, 'type', None)
    passes_screens = bool(getattr(shell_type, 'shieldPenetration', False))

    return Shell(
        kind=shell.kind,
        caliber=float(shell.caliber),
        power_near=_power(shot, 0),
        power_far=_power(shot, 1),
        max_distance=float(shot.maxDistance),
        is_modern_he=_is_modern_he(shell),
        passes_screens=passes_screens,
    )


@guarded('armor: gun shots', ())
def gun_shots(descriptor):
    """The descriptor gun's shots in the client's order, as `(shot, Shell)` pairs (shots it cannot read are left
    out)."""
    pairs = []
    for shot in descriptor.gun.shots:
        shell = shot_shell(shot)
        if shell is not None:
            pairs.append((shot, shell))
    return tuple(pairs)


@guarded('armor: distance factor', 1.0)
def distance_factor(shot, distance):
    """The shell's own penetration factor at `distance` (RU 1.45 helpers_common.computeDistanceFactor), 1 without
    one."""
    compute = client_attr(DISTANCE_FACTOR_MODULE, DISTANCE_FACTOR_NAME)
    if compute is None:
        return 1.0
    return float(compute(shot.shell, distance, PIERCE_FACTOR))


@guarded('armor: shell randomization')
def shell_randomization(shot):
    return getattr(shot.shell, 'piercingPowerRandomization', None)
