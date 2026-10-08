from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.client.armor import probe
from ....core.client.hangar_preview import HangarPreview, has_camera_manager, vehicle_compact_descr
from ....core.client.hud.icons import client_file_exists
from ....core.hud.icons import image
from ....core.hit_book import PART_NAMES
from ....core.log import guarded, log
from ..model import MODULE_KEYS, effect_model, first_plate, hit_geometry, shell_model, vehicle_vector
from .constants import FOCUS_DISTANCE_M, FOCUS_LIMITS_M, GUN_NODE, PROBE_M, TURRET_NODE


def preview_descriptor(target):
    return vehicle_compact_descr(target['cd'], target.get('chassis'), target.get('turret'), target.get('gun'))


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


# The hangar vehicle is swapped and given back through the shared hangar preview (core.client.hangar_preview). A
# recorded point is placed in its part's collision box on the loaded model (model.geometry), the turret and gun take the
# pose the shot found them in, and the camera flies to the hit the way BattleHits' HangarScene._setCameraData does.
# Setting the stage up needs no battle: it only follows the hangar's vehicle changes until a hit asks for a vehicle.
class HangarStage(object):

    def __init__(self, on_loaded):
        self.hangar = HangarPreview('hit viewer', on_loaded)
        self.aim = None
        self.scene = SceneModels()

    @property
    def space(self):
        return self.hangar.space

    def begin(self):
        if not self.hangar.begin():
            log('hit viewer: the hits cannot be shown on a model')
            return False
        if not has_camera_manager():
            log('hit viewer: no hangar camera manager, the camera will not fly to the hits')
        return True

    def show(self, target):
        self.scene.hide()
        self.hangar.show(target['cd'], preview_descriptor(target))

    def end(self):
        self.scene.destroy()
        self.hangar.end()

    def entity(self):
        return self.hangar.entity()

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
        manager = self.hangar.camera_manager()
        if manager is None:
            return
        manager.moveCamera(point, direction.yaw, -direction.pitch, FOCUS_DISTANCE_M, duration, camera_limits())
