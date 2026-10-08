from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.client.armor import probe
from ....core.client.game import client_attr, service
from ....core.client.hud.icons import client_file_exists
from ....core.hud.icons import image
from ....core.hit_book import PART_NAMES
from ....core.hooks import subscribe, unsubscribe
from ....core.log import guarded, log, safe
from ..model import MODULE_KEYS, effect_model, first_plate, hit_geometry, shell_model, vehicle_vector
from .constants import (
    CAMERA_MANAGER_CLASS,
    CAMERA_MANAGER_MODULE,
    FOCUS_DISTANCE_M,
    FOCUS_LIMITS_M,
    GUN_NODE,
    PREVIEW_MODULE,
    PREVIEW_NAME,
    PROBE_M,
    RESTORE_WAIT_S,
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


@guarded('hit viewer: vehicle descriptor')
def preview_descriptor(target):
    from items import parseIntCompactDescr, vehicles
    _, nation_id, inner_id = parseIntCompactDescr(target['cd'])
    descriptor = vehicles.VehicleDescr(typeID=(nation_id, inner_id))
    if target.get('chassis'):
        descriptor.installComponent(target['chassis'])
    if target.get('turret') and target.get('gun'):
        descriptor.installTurret(target['turret'], target['gun'])
    return descriptor.makeCompactDescr()


def map_image(path):
    return image(path) if client_file_exists(path) else None


def is_exact(target):
    return all(target.get(key) for key in MODULE_KEYS)


# RU 1.45 HangarCameraManager.moveCamera keeps the limits it is given and setMinDist writes into them
# (distConstraints[0] = ...), as into the orbit's own Math.Vector2. A tuple raised TypeError there, and again in every
# later vehicle load (HangarVehicleAppearance._reloadColliderType calls setMinDist), so the hangar stayed on "updating
# the hangar" after a tab switch or closing the viewer (python.log, 2026-10-06).
def camera_limits():
    import Math
    return Math.Vector2(*FOCUS_LIMITS_M)


def _rotation(yaw, pitch):
    import Math
    matrix = Math.Matrix()
    matrix.setRotateYPR((yaw, pitch, 0.0))
    return matrix


# poliroid BattleHits' own models (MIT, shipped unmodified), placed the way its HangarScene does it: the shell at the
# hit point turned along its path, the outcome marker at the same point.
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

    # A fixed world matrix, as BattleHits' HangarScene sets it: a signal tied to a model node dangles once the hangar
    # swaps the vehicle.
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
# selected vehicle with its own outfit (RU 1.45 VehiclePreview._dispose). A recorded point is placed in its part's
# collision box on the loaded model (model.geometry), the turret and gun take the pose the shot found them in, and the
# camera flies to the hit the way BattleHits' HangarScene._setCameraData does. Setting the stage up needs no battle:
# it only follows the hangar's vehicle changes until a hit asks for a vehicle.
class HangarStage(object):

    def __init__(self, on_loaded):
        self.on_loaded = on_loaded
        self.space = None
        self.subscribed = None
        self.loading = False
        self.restoring = False
        self.shown = False
        self.generation = 0
        self.aim = None
        self.scene = SceneModels()

    def preview(self):
        return client_attr(PREVIEW_MODULE, PREVIEW_NAME)

    def begin(self):
        self._finish()
        self.restoring = False
        self.generation += 1
        self.space = hangar_space()
        if self.space is None or self.preview() is None:
            log('hit viewer: no hangar space or vehicle preview (%s), the hits cannot be shown on a model'
                % ('space' if self.space is None else 'preview'))
            self.space = None
            return False
        self.subscribed = subscribe(self.space, 'onVehicleChanged', self._on_vehicle_changed)
        if client_attr(CAMERA_MANAGER_MODULE, CAMERA_MANAGER_CLASS) is None:
            log('hit viewer: no hangar camera manager, the camera will not fly to the hits')
        return True

    def show(self, target):
        if self.space is None:
            return
        self.loading = True
        self.shown = True
        self.scene.hide()
        self.preview().selectVehicle(target['cd'], preview_descriptor(target))

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
        self.aim = aim
        model = getattr(getattr(self.entity(), 'appearance', None), 'compoundModel', None)
        if model is None or not aim:
            return
        yaw, pitch = aim
        model.node(TURRET_NODE, _rotation(yaw, 0.0))
        model.node(GUN_NODE, _rotation(0.0, pitch))

    def collisions(self):
        return getattr(getattr(self.entity(), 'appearance', None), 'collisions', None)

    # The parts' collision boxes are all a recorded point needs to be placed: the client's decoder
    # (DamageFromShotDecoder.decodeHitPoints) also ray-tests the collision, which the hangar vehicle may not answer on
    # the frame it reports itself loaded, so a hit came back undecoded (python.log 2026-10-05: "no hit of the vehicle
    # own decoded on the model").
    def boxes(self):
        collisions = self.collisions()
        if collisions is None:
            return None
        found = {}
        for index in range(len(PART_NAMES)):
            box = collisions.getBoundingBox(index)
            if box:
                found[index] = (tuple(box[0]), tuple(box[1]))
        return found

    def geometry(self, segments, boxes):
        return hit_geometry(segments, boxes) if boxes else None

    def offsets(self):
        descriptor = self.entity().appearance.typeDescriptor
        return {
            'hull': tuple(descriptor.chassis.hullPosition),
            'turret': tuple(descriptor.hull.turretPositions[0]),
            'gun': tuple(descriptor.turret.gunPosition),
        }

    def world(self, geometry):
        import Math
        offsets = self.offsets()
        point = vehicle_vector(geometry.part, geometry.point, offsets, self.aim)
        direction = vehicle_vector(geometry.part, geometry.direction, offsets, self.aim, is_point=False)
        vehicle = Math.Matrix(self.entity().model.matrix)
        found = vehicle.applyVector(Math.Vector3(*direction))
        found.normalise()
        return vehicle.applyPoint(Math.Vector3(*point)), found

    # The shared hangar armour probe (core.client.armor, the one the armour map casts): every plate along the shot
    # through the loaded model's collision, the first armoured one measured.
    def measure(self, geometry, shell=None, caliber=None):
        appearance = getattr(self.entity(), 'appearance', None)
        if getattr(appearance, 'collisions', None) is None:
            return None
        point, direction = self.world(geometry)
        start = point - direction * PROBE_M
        end = point + direction * PROBE_M

        return first_plate(probe(appearance, start, end), shell, caliber)

    @guarded('hit viewer: scene models')
    def _show_scene(self, paths, point, direction):
        self.scene.show(self.space.spaceID, paths, point, direction)

    def focus(self, geometry, hit, duration):
        paths = (shell_model(hit.get('shell')), effect_model(hit['outcome'], hit.get('damage')))
        point, direction = self.world(geometry)
        self._show_scene(paths, point, direction)
        manager = camera_manager(self.space)
        if manager is None:
            return
        manager.moveCamera(point, direction.yaw, -direction.pitch, FOCUS_DISTANCE_M, duration, camera_limits())
