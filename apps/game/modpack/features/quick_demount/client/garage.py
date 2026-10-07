from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import service
from ....core.client.garage import is_locked

# RU 1.45 client source: IItemsCache.items.getVehicles(REQ_CRITERIA.INVENTORY), optDevices.setupLayouts.


def _items():
    from skeletons.gui.shared import IItemsCache
    cache = service(IItemsCache)
    return cache.items if cache is not None else None


def _slot_of(vehicle, device_id):
    layouts = getattr(getattr(vehicle, 'optDevices', None), 'setupLayouts', None)
    for _, setup in sorted((getattr(layouts, 'setups', None) or {}).items()):
        ids = list(setup.getIntCDs())
        if device_id in ids:
            return ids.index(device_id)
    return None


def _garage():
    from gui.shared.utils.requesters import REQ_CRITERIA
    items = _items()
    if items is None:
        return {}
    return items.getVehicles(REQ_CRITERIA.INVENTORY)


def carriers_of(device_id):
    rows = []
    for vehicle in _garage().values():
        slot = _slot_of(vehicle, device_id)
        if slot is None:
            continue
        rows.append({
            'id': vehicle.intCD,
            'name': vehicle.shortUserName,
            'tier': vehicle.level,
            'slot': slot,
            'locked': is_locked(vehicle),
        })
    return rows


def demount(vehicle_id, device_id):
    from gui.shared.gui_items.items_actions import factory
    items = _items()
    vehicle = items.getItemByCD(vehicle_id) if items is not None else None
    if vehicle is None or is_locked(vehicle):
        return False
    slot = _slot_of(vehicle, device_id)
    if slot is None:
        return False
    device = items.getItemByCD(device_id)
    factory.doAction(factory.REMOVE_OPT_DEVICE, vehicle, device, slot, False, forFitting=False, everywhere=True)
    return True
