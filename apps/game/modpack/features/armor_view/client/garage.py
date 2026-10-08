from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import client_attr, selected_vehicle, service, vehicle_type
from ....core.compat import to_text
from ....core.log import guarded
from ..model import Module, ModuleChoice, TankRow, Turret, garage_order, is_listed
from .constants import PREVIEW_MODULE, PREVIEW_NAME

# RU 1.45 client source: IItemsCache.items.getVehicles(REQ_CRITERIA.INVENTORY / EMPTY) gives gui Vehicle items
# (intCD, shortUserName, level, type = the class tag, descriptor, isHidden, isEvent, isOnlyForEventBattles,
# isObserver, name); a vehicle type's turrets (type.turrets[0]) carry their guns, each with compactDescr and
# shortUserString.


def _items():
    from skeletons.gui.shared import IItemsCache
    cache = service(IItemsCache)
    return cache.items if cache is not None else None


def _vehicles(criteria_name):
    from gui.shared.utils.requesters import REQ_CRITERIA
    items = _items()
    if items is None:
        return []
    return list(items.getVehicles(getattr(REQ_CRITERIA, criteria_name)).values())


def _row(vehicle, is_own):
    return TankRow(
        cd=vehicle.intCD,
        name=to_text(vehicle.shortUserName),
        tier=vehicle.level,
        kind=getattr(vehicle, 'type', None),
        is_own=is_own,
    )


def _flags(vehicle):
    name = getattr(vehicle, 'name', '') or ''
    is_event = getattr(vehicle, 'isEvent', False) or getattr(vehicle, 'isOnlyForEventBattles', False)
    return {
        'is_hidden': getattr(vehicle, 'isHidden', False),
        'is_event': is_event,
        'is_observer': getattr(vehicle, 'isObserver', False),
        'is_bot': name.endswith('_bot'),
    }


@guarded('armor view: garage', ())
def garage_vehicles():
    return tuple(_vehicles('INVENTORY'))


def garage_rows(vehicles):
    return tuple(garage_order([_row(vehicle, True) for vehicle in vehicles]))


@guarded('armor view: every tank', ())
def catalogue_rows():
    rows = []
    for vehicle in _vehicles('EMPTY'):
        if is_listed(_flags(vehicle)):
            rows.append(_row(vehicle, False))
    return tuple(rows)


def own_vehicle(vehicles, tank_id):
    for vehicle in vehicles:
        if vehicle.intCD == tank_id:
            return vehicle
    return None


def _module_name(item):
    name = getattr(item, 'shortUserString', None) or getattr(item, 'userString', u'')
    return to_text(name)


def _turret(item):
    guns = [Module(cd=gun.compactDescr, name=_module_name(gun)) for gun in item.guns]
    return Turret(cd=item.compactDescr, name=_module_name(item), guns=guns)


@guarded('armor view: modules', ())
def turrets_of(tank_id):
    found = vehicle_type(tank_id)
    if found is None:
        return ()
    return tuple(_turret(item) for item in found.turrets[0])


@guarded('armor view: tank row')
def tank_row_of(tank_id, is_own):
    found = vehicle_type(tank_id)
    if found is None:
        return None
    return TankRow(
        cd=tank_id,
        name=to_text(found.shortUserString),
        tier=found.level,
        kind=getattr(found, 'classTag', None),
        is_own=is_own,
    )


@guarded('armor view: installed modules')
def installed_modules(vehicle):
    descriptor = vehicle.descriptor
    choice = ModuleChoice(turret=descriptor.turret.compactDescr, gun=descriptor.gun.compactDescr)
    return choice, descriptor.chassis.compactDescr


def selected_tank():
    return selected_vehicle()


@guarded('armor view: vehicle preview', None)
def previewed_tank_id():
    preview = client_attr(PREVIEW_MODULE, PREVIEW_NAME)
    if preview is None or not preview.isPresent():
        return None
    return getattr(preview.item, 'intCD', None)
