# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import client_attr, service
from ....core.compat import to_text
from ....core.log import guarded
from ..model.constants import KIND_SHELLS
from .constants import KIND_TYPES, SPECIAL_DEVICE_FLAGS

# RU 1.45 client source: IItemsCache.items.getItems(itemTypeID, criteria), REQ_CRITERIA.INVENTORY.


def _items_cache():
    return getattr(service(client_attr('skeletons.gui.shared', 'IItemsCache')), 'items', None)


def _type_ids(names):
    item_types = client_attr('gui.shared.gui_items', 'GUI_ITEM_TYPE')
    found = [getattr(item_types, name, None) for name in names]
    return tuple(value for value in found if value is not None)


def _flag(item, name):
    value = getattr(item, name, False)
    if hasattr(value, '__call__'):
        value = value()
    return bool(value)


def _credits(item):
    price = getattr(item.getSellPrice(), 'price', None)
    return int(getattr(price, 'credits', 0) or 0)


def _fitting_shells(items, criteria, vehicles):
    fitting = set()
    guns = list(items.getItems(_type_ids(('GUN',)), criteria.INVENTORY | criteria.VEHICLE.SUITABLE(vehicles)).values())
    for gun in guns + [getattr(vehicle, 'gun', None) for vehicle in vehicles]:
        fitting.update(shell.intCD for shell in getattr(gun, 'defaultAmmo', None) or ())
    return fitting


def _fitting(items, criteria, vehicles, kind, type_ids):
    if kind == KIND_SHELLS:
        return _fitting_shells(items, criteria, vehicles)
    suitable = items.getItems(type_ids, criteria.INVENTORY | criteria.VEHICLE.SUITABLE(vehicles, type_ids))
    return set(suitable.keys())


def _item(item, kind, fitting):
    special = _flag(item, 'isBoughtForAltPrice') or any(_flag(item, name) for name in SPECIAL_DEVICE_FLAGS)
    return {
        'cd': item.intCD,
        'type_id': getattr(item, 'itemTypeID', 0),
        'kind': kind,
        'name': to_text(getattr(item, 'userName', u'') or u''),
        'count': getattr(item, 'inventoryCount', 0),
        'price': _credits(item),
        'fits': item.intCD in fitting,
        'special': special,
        'for_sale': _flag(item, 'isForSale') and not _flag(item, 'isHidden'),
    }


@guarded('depot seller: depot', fallback=[])
def depot_items():
    items = _items_cache()
    criteria = client_attr('gui.shared.utils.requesters', 'REQ_CRITERIA')
    if items is None or criteria is None:
        return []
    vehicles = list(items.getVehicles(criteria.INVENTORY).values())
    found = []
    for kind, names in KIND_TYPES:
        type_ids = _type_ids(names)
        if not type_ids:
            continue
        fitting = _fitting(items, criteria, vehicles, kind, type_ids)
        found.extend(_item(item, kind, fitting) for item in items.getItems(type_ids, criteria.INVENTORY).values())
    return found


def _member(tankman):
    descriptor = getattr(tankman, 'descriptor', None)
    return {
        'inv_id': tankman.invID,
        'name': to_text(getattr(tankman, 'fullUserName', u'') or u''),
        'role': to_text(getattr(tankman, 'roleUserName', u'') or u''),
        'skills': int(getattr(tankman, 'earnedSkillsCount', 0) or 0),
        'premium': bool(getattr(descriptor, 'isPremium', False) or getattr(descriptor, 'isFemale', False)),
        'locked': _flag(tankman, 'isLockedByVehicle'),
    }


@guarded('depot seller: barracks', fallback=[])
def reserve_crew():
    items = _items_cache()
    if items is None:
        return []
    tankmen = items.getInventoryTankmen()
    members = tankmen.values() if hasattr(tankmen, 'values') else tankmen
    return [_member(tankman) for tankman in members if not getattr(tankman, 'isInTank', True)]


def tankmen_by_id(inv_ids):
    items = _items_cache()
    if items is None:
        return []
    found = [items.getTankman(inv_id) for inv_id in inv_ids]
    return [tankman for tankman in found if tankman is not None]
