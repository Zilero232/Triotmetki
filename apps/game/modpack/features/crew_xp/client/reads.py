from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import client_attr, selected_vehicle, service
from ....core.compat import to_text
from ....core.log import guarded

# RU 1.45 client source: Vehicle.crew, Tankman.getNextSkillXpCost(), getTankmanDossier().getAvgXP().


def _items():
    return getattr(service(client_attr('skeletons.gui.shared', 'IItemsCache')), 'items', None)


def _avg_xp(items, tankman):
    if items is None:
        return None
    dossier = items.getTankmanDossier(tankman.invID)
    return dossier.getAvgXP() if dossier is not None else None


def _level(tankman):
    role_level = getattr(tankman, 'roleLevel', None)
    if role_level is not None and role_level < 100:
        return role_level
    return getattr(getattr(tankman, 'descriptor', None), 'lastSkillLevel', None)


def _factor(vehicle):
    vehicle_type = getattr(getattr(vehicle, 'descriptor', None), 'type', None)
    return getattr(vehicle_type, 'crewXpFactor', 1.0) if vehicle_type is not None else 1.0


def member(tankman, vehicle, items):
    return {
        'role': to_text(getattr(tankman, 'roleUserName', u'') or u''),
        'name': to_text(getattr(tankman, 'fullUserName', u'') or u''),
        'xp_left': tankman.getNextSkillXpCost(),
        'level': _level(tankman),
        'avg_xp': _avg_xp(items, tankman),
        'factor': _factor(vehicle),
    }


def selected_crew():
    vehicle = selected_vehicle()
    if vehicle is None:
        return []
    return _crew_of(vehicle)


@guarded('crew xp: crew', fallback=[])
def _crew_of(vehicle):
    items = _items()
    crew = getattr(vehicle, 'crew', None) or []
    return [member(tankman, vehicle, items) for _, tankman in crew if tankman]


def tankman_member(tankman_id):
    items = _items()
    tankman = items.getTankman(tankman_id) if items is not None else None
    if tankman is None or getattr(tankman, 'isDismissed', False):
        return None
    vehicle = items.getVehicle(tankman.vehicleInvID) if getattr(tankman, 'isInTank', False) else None
    return member(tankman, vehicle, items)
