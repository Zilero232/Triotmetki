from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.client.game import client_attr, service
from ....core.hooks import subscribe, unsubscribe
from ....core.log import log, log_exception, safe
from ..model import MODULE_KEYS, first_plate
from .constants import (
    CAMERA_MANAGER_CLASS,
    CAMERA_MANAGER_MODULE,
    DECODER_CLASS,
    DECODER_MODULE,
    LAST_STRUCTURAL_INDEX,
    MATERIAL_PARTS,
    PREVIEW_MODULE,
    PREVIEW_NAME,
    PROBE_M,
    PROJECTION_FUNCTION,
    PROJECTION_MODULE,
    RESTORE_WAIT_S,
    TAIL_M,
)


def hangar_space():
    try:
        from skeletons.gui.shared.utils import IHangarSpace
    except ImportError:
        return None
    return service(IHangarSpace)


def camera_manager(space):
    manager_class = client_attr(CAMERA_MANAGER_MODULE, CAMERA_MANAGER_CLASS)
    if manager_class is None or space is None:
        return None
    import CGF
    return CGF.getManager(space.spaceID, manager_class)


# The hangar camera as the client's HangarCameraManager.moveCamera takes it back: the orbit's target point, yaw,
# pitch and distance (its camera's `target`, `source` and `pivotMaxDist`, RU 1.45 cgf_components/
# hangar_camera_manager.py).
def camera_place():
    import Math
    camera = BigWorld.camera()
    source = Math.Matrix(camera.source)
    target = Math.Matrix(camera.target)
    return {'target': target.translation, 'yaw': source.yaw, 'pitch': source.pitch, 'distance': camera.pivotMaxDist}


def preview_descriptor(target):
    """The packed descriptor of the recorded vehicle with its recorded chassis, turret and gun, or None (the stock
    model is shown)."""
    from items import parseIntCompactDescr, vehicles
    _, nation_id, inner_id = parseIntCompactDescr(target['cd'])
    descriptor = vehicles.VehicleDescr(typeID=(nation_id, inner_id))
    if target.get('chassis'):
        descriptor.installComponent(target['chassis'])
    if target.get('turret') and target.get('gun'):
        descriptor.installTurret(target['turret'], target['gun'])
    return descriptor.makeCompactDescr()


def is_exact(target):
    return all(target.get(key) for key in MODULE_KEYS)


def _max_component_index(descriptor):
    tracks = getattr(getattr(descriptor, 'chassis', None), 'tracks', None)
    pairs = getattr(tracks, 'trackPairs', None) or ()
    return LAST_STRUCTURAL_INDEX + max(len(pairs) - 1, 0)


# The hangar vehicle is swapped the way the client's own vehicle preview does it (CurrentVehicle.g_currentPreviewVehicle
# .selectVehicle(intCD, strCD): HangarSpace.updatePreviewVehicle with the stock style), and given back with its
# selectNoVehicle(), which refreshes the selected vehicle with its own outfit (RU 1.45 VehiclePreview._dispose). The
# hits are decoded on the loaded model by the client's own decoder (VehicleEffects.DamageFromShotDecoder.decodeHitPoints
# on the hangar appearance's collisions), so a marker sits where the battle drew the hit effect. UNVERIFIED on Lesta
# 1.45: the preview swap outside the preview view, the collision component of the hangar vehicle and the camera fields.
class HangarStage(object):

    def __init__(self, on_loaded):
        self.on_loaded = on_loaded
        self.space = None
        self.saved_camera = None
        self.loading = False
        self.restoring = False
        self.shown = False

    def preview(self):
        return client_attr(PREVIEW_MODULE, PREVIEW_NAME)

    def begin(self):
        self.space = hangar_space()
        if self.space is None or self.preview() is None:
            return False
        try:
            self.saved_camera = camera_place()
        except Exception:
            log_exception('hit viewer: camera place')
            self.saved_camera = None
        subscribe(self.space, 'onVehicleChanged', self._on_vehicle_changed)
        return True

    def show(self, target):
        self.loading = True
        self.shown = True
        try:
            str_cd = preview_descriptor(target)
        except Exception:
            log_exception('hit viewer: vehicle descriptor')
            str_cd = None
        self.preview().selectVehicle(target['cd'], str_cd)

    def end(self):
        if self.space is None:
            return
        self.loading = False
        if not self.shown:
            self._finish()
            return
        self.restoring = True
        self.shown = False
        self.preview().selectNoVehicle()
        BigWorld.callback(RESTORE_WAIT_S, self._restore_late)

    @safe
    def _on_vehicle_changed(self):
        if self.restoring:
            self._restore_camera()
            return
        if self.loading:
            self.loading = False
            self.on_loaded()

    @safe
    def _restore_late(self):
        if self.restoring:
            self._restore_camera()

    def _restore_camera(self):
        self.restoring = False
        saved, manager = self.saved_camera, camera_manager(self.space)
        if saved is not None and manager is not None:
            manager.moveCamera(saved['target'], saved['yaw'], saved['pitch'], saved['distance'], 0)
        self._finish()

    def _finish(self):
        if self.space is not None:
            unsubscribe(self.space, 'onVehicleChanged', self._on_vehicle_changed)
        self.space = None
        log('hit viewer: the hangar vehicle and camera are back')

    def entity(self):
        return self.space.getVehicleEntity() if self.space is not None else None

    def decode(self, segments):
        """(part node name, local point, local direction) of a shot on the shown model, or None."""
        entity = self.entity()
        decoder = client_attr(DECODER_MODULE, DECODER_CLASS)
        appearance = getattr(entity, 'appearance', None)
        collisions = getattr(appearance, 'collisions', None)
        if decoder is None or collisions is None:
            return None
        descriptor = appearance.typeDescriptor
        points = decoder.decodeHitPoints(segments, collisions, _max_component_index(descriptor), descriptor)
        if not points:
            return None
        first, last = points[0], points[-1]
        return last.componentName, last.matrix.translation, first.matrix.applyToAxis(2)

    def world(self, decoded):
        import Math
        name, point, direction = decoded
        node = Math.Matrix(self.entity().model.node(name))
        world_direction = node.applyVector(direction)
        world_direction.normalise()
        return node.applyPoint(point), world_direction

    def measure(self, decoded):
        """The first plate along the shot on the shown model ({angle, armor, nominal}), or None."""
        point, direction = self.world(decoded)
        appearance = self.entity().appearance
        found = appearance.collisions.collideAllWorld(point - direction * PROBE_M, point + direction * PROBE_M)
        layers = []
        for _, hit_angle_cos, material_kind, part_index in found or ():
            material = self._material(appearance.typeDescriptor, part_index, material_kind)
            if material is not None:
                layers.append((hit_angle_cos, material.armor, material.useHitAngle))
        return first_plate(layers)

    @staticmethod
    def _material(descriptor, part_index, material_kind):
        if not 0 <= part_index < len(MATERIAL_PARTS):
            return None
        part = getattr(descriptor, MATERIAL_PARTS[part_index], None)
        materials = getattr(part, 'materials', None)
        return materials.get(material_kind) if materials is not None else None

    def clip(self, decoded):
        """The clip-space (x, y, z, w) of the hit point and of its direction line's start."""
        import Math
        project = client_attr(PROJECTION_MODULE, PROJECTION_FUNCTION)
        matrix = project()
        point, direction = self.world(decoded)
        tail = point - direction * TAIL_M
        return tuple(self._apply(matrix, Math.Vector4(value.x, value.y, value.z, 1.0)) for value in (point, tail))

    @staticmethod
    def _apply(matrix, vector):
        found = matrix.applyV4Point(vector)
        return found.x, found.y, found.z, found.w

    def focus(self, decoded, duration):
        _, direction = self.world(decoded)
        manager = camera_manager(self.space)
        if manager is not None:
            manager.moveCamera(None, direction.yaw, direction.pitch, None, duration)
