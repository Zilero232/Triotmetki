from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.log import guarded, log
from ..model import preset_pose
from ..model.constants import CAMERA_FLY_S, CAMERA_ORBIT_M
from .constants import CENTRE, FAR_CORNER, HULL_PART, NEAR_CORNER


def _hull_box(entity):
    import Math
    return Math.Matrix(entity.model.getBoundsForPart(HULL_PART))


def _point(box, corner):
    import Math
    return box.applyPoint(Math.Vector3(*corner))


# RU 1.45 HangarCameraManager.moveCamera keeps the limits it is given and setMinDist writes into them, so they are the
# client's own Math.Vector2 (core.client.hangar_preview resets them when the screen closes; hit_viewer found a tuple
# raising in every later vehicle load).
def _limits():
    import Math
    return Math.Vector2(*CAMERA_ORBIT_M)


@guarded('armor view: camera preset', False)
def fly_to(manager, entity, preset_id):
    import Math
    if manager is None or entity is None:
        return False
    box = _hull_box(entity)
    centre = _point(box, CENTRE)
    size = (_point(box, FAR_CORNER) - _point(box, NEAR_CORNER)).length
    vehicle_yaw = Math.Matrix(entity.model.matrix).yaw

    pose = preset_pose(preset_id, vehicle_yaw, size)
    if pose is None:
        return False
    manager.moveCamera(centre, pose.yaw, pose.pitch, pose.distance, CAMERA_FLY_S, _limits())
    log('armor view: camera %s: yaw %.2f, pitch %.2f, %.1f m (tank yaw %.2f, size %.1f m)' % (
        preset_id, pose.yaw, pose.pitch, pose.distance, vehicle_yaw, size,
    ))
    return True
