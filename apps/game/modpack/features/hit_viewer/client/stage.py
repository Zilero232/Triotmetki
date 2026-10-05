from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.client.game import client_attr, service
from ....core.hooks import subscribe, unsubscribe
from ....core.log import log, log_exception, safe
from ..model import MODULE_KEYS, along, effect_model, first_plate, shell_model
from .constants import (
    CAMERA_MANAGER_CLASS,
    CAMERA_MANAGER_MODULE,
    DECODER_CLASS,
    DECODER_MODULE,
    FOCUS_DISTANCE_M,
    FOCUS_LIMITS_M,
    GUN_NODE,
    LAST_STRUCTURAL_INDEX,
    MATERIAL_PARTS,
    PREVIEW_MODULE,
    PREVIEW_NAME,
    PROBE_M,
    PROJECTION_FUNCTION,
    PROJECTION_MODULE,
    RESTORE_WAIT_S,
    TAIL_M,
    TURRET_NODE,
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


def preview_descriptor(target):
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


def _material(descriptor, part_index, material_kind):
    found = None
    if 0 <= part_index < len(MATERIAL_PARTS):
        materials = getattr(getattr(descriptor, MATERIAL_PARTS[part_index], None), 'materials', None)
        found = materials.get(material_kind) if materials is not None else None
    if found is None:
        from items import vehicles
        found = vehicles.g_cache.commonConfig['materials'].get(material_kind)
    return found


def _rotation(yaw, pitch):
    import Math
    matrix = Math.Matrix()
    matrix.setRotateYPR((yaw, pitch, 0.0))
    return matrix


# poliroid BattleHits' own models (MIT, shipped unmodified), placed the way its HangarScene does it. UNVERIFIED on Lesta
# 1.45: the models load and draw in the hangar space.
class SceneModels(object):

    def __init__(self):
        self.models = {}
        self.space_id = None

    def _model(self, path):
        if path in self.models:
            return self.models[path]
        import Math
        model = BigWorld.Model(path)
        motor = BigWorld.Servo(Math.Matrix())
        model.addMotor(motor)
        model.castsShadow = False
        model.visible = False
        BigWorld.addModel(model, self.space_id)
        self.models[path] = (model, motor)
        return self.models[path]

    def show(self, space_id, paths, point, direction):
        self.hide()
        self.space_id = space_id
        placement = _rotation(direction.yaw, direction.pitch)
        placement.translation = point
        for path in paths:
            if path is None:
                continue
            model, motor = self._model(path)
            motor.signal = placement
            model.visible = True

    def hide(self):
        for model, _ in self.models.values():
            model.visible = False

    def destroy(self):
        for model, _ in self.models.values():
            if model in BigWorld.models():
                BigWorld.delModel(model)
        self.models = {}


# The hangar vehicle is swapped the way the client's own vehicle preview does it (CurrentVehicle.g_currentPreviewVehicle
# .selectVehicle(intCD, strCD): HangarSpace.updatePreviewVehicle with the stock style; the stock EarlyAccessVehicleView,
# a Gameface lobby sub view like ours, does the same), and given back with its selectNoVehicle(), which refreshes the
# selected vehicle with its own outfit (RU 1.45 VehiclePreview._dispose). The hits are decoded on the loaded model by
# the client's own decoder (VehicleEffects.DamageFromShotDecoder.decodeHitPoints on the hangar appearance's collisions),
# so a marker sits where the battle drew the hit effect; the turret and gun take the pose the shot found them in, and
# the camera flies to the hit the way BattleHits' HangarScene._setCameraData does. UNVERIFIED on Lesta 1.45: the
# collision component of the hangar vehicle, the node pose and the camera flight.
class HangarStage(object):

    def __init__(self, on_loaded):
        self.on_loaded = on_loaded
        self.space = None
        self.subscribed = None
        self.loading = False
        self.restoring = False
        self.shown = False
        self.generation = 0
        self.scene = SceneModels()

    def preview(self):
        return client_attr(PREVIEW_MODULE, PREVIEW_NAME)

    def begin(self):
        self._finish()
        self.restoring = False
        self.generation += 1
        self.space = hangar_space()
        if self.space is None or self.preview() is None:
            return False
        self.subscribed = subscribe(self.space, 'onVehicleChanged', self._on_vehicle_changed)
        if client_attr(CAMERA_MANAGER_MODULE, CAMERA_MANAGER_CLASS) is None:
            log('hit viewer: no hangar camera manager, the camera will not fly to the hits')
        return True

    def show(self, target):
        self.loading = True
        self.shown = True
        self.scene.hide()
        try:
            str_cd = preview_descriptor(target)
        except Exception:
            log_exception('hit viewer: vehicle descriptor')
            str_cd = None
        self.preview().selectVehicle(target['cd'], str_cd)

    def end(self):
        self.scene.destroy()
        if self.space is None:
            return
        self.loading = False
        if not self.shown:
            self._finish()
            return
        self.restoring = True
        self.shown = False
        self.preview().selectNoVehicle()
        generation = self.generation
        BigWorld.callback(RESTORE_WAIT_S, lambda: self._restore_late(generation))

    @safe
    def _on_vehicle_changed(self):
        if self.restoring:
            self._restore_camera()
            return
        if self.loading:
            self.loading = False
            self.on_loaded()

    @safe
    def _restore_late(self, generation):
        if self.restoring and generation == self.generation:
            self._restore_camera()

    def _restore_camera(self):
        self.restoring = False
        manager = camera_manager(self.space)
        if manager is not None:
            manager.resetCameraTarget(0)
        self._finish()

    def _finish(self):
        if self.space is None:
            return
        if self.subscribed is not None:
            unsubscribe(self.space, 'onVehicleChanged', self.subscribed)
        self.space, self.subscribed = None, None
        log('hit viewer: the hangar vehicle and camera are back')

    def entity(self):
        return self.space.getVehicleEntity() if self.space is not None else None

    # BattleHits Vehicle.__updateAppereance poses the turret and gun the same way.
    def pose(self, aim):
        model = getattr(getattr(self.entity(), 'appearance', None), 'compoundModel', None)
        if model is None or not aim:
            return
        yaw, pitch = aim
        model.node(TURRET_NODE, _rotation(yaw, 0.0))
        model.node(GUN_NODE, _rotation(0.0, pitch))

    def decode(self, segments):
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

    def measure(self, decoded, shell=None, caliber=None):
        point, direction = self.world(decoded)
        appearance = self.entity().appearance
        found = appearance.collisions.collideAllWorld(point - direction * PROBE_M, point + direction * PROBE_M)
        layers = []
        for _, hit_angle_cos, material_kind, part_index in found or ():
            material = _material(appearance.typeDescriptor, part_index, material_kind)
            if material is not None and material.armor:
                layers.append((hit_angle_cos, material.armor, material.useHitAngle))
        return first_plate(layers, shell, caliber)

    def clip(self, decoded):
        import Math
        project = client_attr(PROJECTION_MODULE, PROJECTION_FUNCTION)
        matrix = project()
        point, direction = self.world(decoded)
        tail = Math.Vector3(*along(tuple(point), tuple(direction), -TAIL_M))
        return tuple(self._apply(matrix, Math.Vector4(value.x, value.y, value.z, 1.0)) for value in (point, tail))

    @staticmethod
    def _apply(matrix, vector):
        found = matrix.applyV4Point(vector)
        return found.x, found.y, found.z, found.w

    def focus(self, decoded, hit, duration):
        point, direction = self.world(decoded)
        paths = (shell_model(hit.get('shell')), effect_model(hit['outcome'], hit.get('damage')))
        try:
            self.scene.show(self.space.spaceID, paths, point, direction)
        except Exception:
            log_exception('hit viewer: scene models')
        manager = camera_manager(self.space)
        if manager is not None:
            manager.moveCamera(point, direction.yaw, -direction.pitch, FOCUS_DISTANCE_M, duration, FOCUS_LIMITS_M)
