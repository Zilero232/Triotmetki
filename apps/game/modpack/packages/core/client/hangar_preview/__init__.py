"""Another vehicle in the hangar for a screen over it, and the selected one back afterwards.

The hangar vehicle is swapped the way the client's own vehicle preview does it (`CurrentVehicle.g_currentPreviewVehicle
.selectVehicle(intCD, strCD)`: `HangarSpace.updatePreviewVehicle` with the stock style; the stock
EarlyAccessVehicleView, a Gameface lobby sub view, does the same) and given back with its `selectNoVehicle()`, which
refreshes the selected vehicle with its own outfit (RU 1.45 VehiclePreview._dispose). The camera is reset to the
vehicle once it is back (`HangarCameraManager.resetCameraTarget(0)`), also after a screen that only moved the camera.
Used by hit_viewer and armor_view.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ...hooks import subscribe, unsubscribe
from ...log import guarded, log, safe
from ..game import client_attr, service
from .constants import CAMERA_MANAGER_CLASS, CAMERA_MANAGER_MODULE, PREVIEW_MODULE, PREVIEW_NAME, RESTORE_WAIT_S


def hangar_space():
    """The client's IHangarSpace service, or None outside the lobby."""
    try:
        from skeletons.gui.shared.utils import IHangarSpace
    except ImportError:
        return None
    return service(IHangarSpace)


def camera_manager(space):
    """The hangar space's HangarCameraManager (a CGF manager), or None."""
    manager_class = client_attr(CAMERA_MANAGER_MODULE, CAMERA_MANAGER_CLASS)
    if manager_class is None or space is None:
        return None
    import CGF
    return CGF.getManager(space.spaceID, manager_class)


def has_camera_manager():
    return client_attr(CAMERA_MANAGER_MODULE, CAMERA_MANAGER_CLASS) is not None


@guarded('hangar preview: vehicle descriptor')
def vehicle_compact_descr(tank_id, chassis=None, turret=None, gun=None):
    """The packed descriptor of the vehicle type `tank_id` with the given modules (compact descriptors; the type's
    stock ones when left out), as the vehicle preview takes it (items.vehicles.VehicleDescr, RU 1.45)."""
    from items import parseIntCompactDescr, vehicles
    _, nation_id, inner_id = parseIntCompactDescr(tank_id)
    descriptor = vehicles.VehicleDescr(typeID=(nation_id, inner_id))
    if chassis:
        descriptor.installComponent(chassis)
    if turret and gun:
        descriptor.installTurret(turret, gun)
    return descriptor.makeCompactDescr()


class HangarPreview(object):
    """`begin()` follows the hangar's vehicle changes, `show(cd, compact)` puts a vehicle in the hangar and calls
    `on_loaded()` when it is there, `end(reset_camera)` gives the selected vehicle and the camera back. Log lines go
    under `context`."""

    def __init__(self, context, on_loaded):
        self.context = context
        self.on_loaded = on_loaded
        self.space = None
        self.subscribed = None
        self.loading = False
        self.restoring = False
        self.shown = False
        self.generation = 0

    def preview(self):
        return client_attr(PREVIEW_MODULE, PREVIEW_NAME)

    def begin(self):
        self._finish()
        self.restoring = False
        self.shown = False
        self.generation += 1
        self.space = hangar_space()
        if self.space is None or self.preview() is None:
            missing = 'space' if self.space is None else 'preview'
            log('%s: no hangar space or vehicle preview (%s)' % (self.context, missing))
            self.space = None
            return False
        self.subscribed = subscribe(self.space, 'onVehicleChanged', self._on_vehicle_changed)
        return True

    def show(self, tank_id, compact_descr):
        if self.space is None:
            return False
        self.loading = True
        self.shown = True
        self.preview().selectVehicle(tank_id, compact_descr)
        return True

    def end(self, reset_camera=False):
        if self.space is None:
            return
        self.loading = False
        if not self.shown:
            self._back_without_swap(reset_camera)
            return
        self.restoring = True
        self.shown = False
        self.preview().selectNoVehicle()
        generation = self.generation
        BigWorld.callback(RESTORE_WAIT_S, lambda: self._restore_late(generation))

    def entity(self):
        return self.space.getVehicleEntity() if self.space is not None else None

    def camera_manager(self):
        return camera_manager(self.space)

    def _back_without_swap(self, reset_camera):
        if reset_camera:
            self._restore_camera()
            return
        self._finish()

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
        self.space = None
        self.subscribed = None
        log('%s: the hangar vehicle and camera are back' % self.context)
