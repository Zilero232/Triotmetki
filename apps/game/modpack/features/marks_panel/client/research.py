from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import client_attr, selected_vehicle, service

# RU 1.45 client source: Vehicle.getUnlocksDescrs(), stats.unlocks, g_techTreeDP.getBlueprintDiscountData.


def _items():
    cache = service(client_attr('skeletons.gui.shared', 'IItemsCache'))
    return getattr(cache, 'items', None)


def _vehicle_cost(node_id, level, cost):
    from gui.techtree.techtree_dp import g_techTreeDP
    return g_techTreeDP.getBlueprintDiscountData(node_id, level, cost)[1]


def _node(items, node_id, cost, required):
    from gui.shared.gui_items import GUI_ITEM_TYPE
    item = items.getItemByCD(node_id)
    is_vehicle = getattr(item, 'itemTypeID', None) == GUI_ITEM_TYPE.VEHICLE
    level = getattr(item, 'level', None)
    return {
        'id': node_id,
        'cost': _vehicle_cost(node_id, level, cost) if is_vehicle else cost,
        'vehicle': is_vehicle,
        'name': getattr(item, 'shortUserName', None) or u'',
        'tier': level,
        'required': sorted(required),
    }


def _avg_xp(items, tank_id):
    dossier = items.getVehicleDossier(tank_id)
    return dossier.getRandomStats().getAvgXP() if dossier is not None else None


def selected_research():
    vehicle = selected_vehicle()
    items = _items()
    unlocks = getattr(getattr(items, 'stats', None), 'unlocks', None)
    table = getattr(vehicle, 'getUnlocksDescrs', None)
    if unlocks is None or table is None:
        return None
    unlocked = set(unlocks)
    nodes = [_node(items, node_id, cost, required) for _, cost, node_id, required in table() if node_id not in unlocked]
    return {
        'tank_id': vehicle.intCD,
        'xp': vehicle.xp,
        'elite': vehicle.isElite,
        'avg_xp': _avg_xp(items, vehicle.intCD),
        'nodes': nodes,
    }
