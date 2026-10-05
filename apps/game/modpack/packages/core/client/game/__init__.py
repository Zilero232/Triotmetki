"""Small reads of client state shared by the companion glue and the features (all tolerate a missing API)."""
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib  # novermin

from ...compat import is_int, string_types
from ...hooks import subscribe
from ...log import log_exception


def client_version():
    try:
        from helpers import getFullClientVersion
        return getFullClientVersion()
    except Exception:
        return ''


def client_language():
    try:
        from helpers import getClientLanguage
        return getClientLanguage()
    except Exception:
        return None


def client_attr(module_name, name):
    """`module_name.name` of the client, or None when the module or the name is missing."""
    try:
        return getattr(importlib.import_module(module_name), name, None)
    except Exception:
        return None


def service(skeleton):
    """The client's instance of a `skeletons.*` interface (helpers.dependency), or None."""
    if skeleton is None:
        return None
    try:
        from helpers import dependency
        return dependency.instance(skeleton)
    except Exception:
        return None


def values_by_name(holder, pairs):
    """{holder.<name>: value} for the (name, value) pairs whose name the client's enum class has."""
    table = {}
    for name, value in pairs:
        key = getattr(holder, name, None)
        if key is not None:
            table[key] = value
    return table


def selected_vehicle():
    """The vehicle selected in the hangar (CurrentVehicle.g_currentVehicle.item), or None."""
    try:
        from CurrentVehicle import g_currentVehicle
    except ImportError:
        return None
    return getattr(g_currentVehicle, 'item', None)


def selected_tank_id():
    """The type id (intCD) of the vehicle selected in the hangar, or None."""
    return getattr(selected_vehicle(), 'intCD', None)


def on_vehicle_changed(callback, owner):
    """Calls `callback()` when the vehicle selected in the hangar changes (g_currentVehicle.onChanged); a client
    without it is logged under `owner`."""
    try:
        from CurrentVehicle import g_currentVehicle
        subscribe(g_currentVehicle, 'onChanged', callback)
    except Exception:
        log_exception('%s: current vehicle' % owner)


def player_tank_id(player):
    descriptor = getattr(player, 'vehicleTypeDescriptor', None)
    vehicle_type = getattr(descriptor, 'type', None)
    return getattr(vehicle_type, 'compactDescr', None)


# `tank_id` as the int items.vehicles.getVehicleType decodes, or None. RU 1.45 source: only an int or a long is read as
# a type id (isVehicleTypeCompactDescr); any other value is parsed as a packed vehicle descriptor, so a digit string
# would name another vehicle.
def type_compact_descr(tank_id):
    if is_int(tank_id):
        value = tank_id
    elif isinstance(tank_id, string_types) and tank_id.isdigit():
        value = int(tank_id)
    else:
        return None
    return value if value > 0 else None


def vehicle_type(tank_id):
    """The client's VehicleType of a type id (items.vehicles.getVehicleType, RU 1.45), or None."""
    type_cd = type_compact_descr(tank_id)
    if type_cd is None:
        return None
    try:
        from items import vehicles
        return vehicles.getVehicleType(type_cd)
    except Exception:
        return None


def vehicle_info(tank_id):
    found = vehicle_type(tank_id)
    if found is None:
        return None, None
    return getattr(found, 'name', None), getattr(found, 'level', None)


def map_name(arena_type_id):
    try:
        import ArenaType
        return getattr(ArenaType.g_cache.get(arena_type_id), 'geometryName', None)
    except Exception:
        return None


def vehicle_short_name(tank_id):
    """The localized short vehicle name the carousel shows, or None."""
    return getattr(vehicle_type(tank_id), 'shortUserString', None)


def main_window():
    """The client's main wulf window, the parent mods give their windows (IGuiLoader.windowsManager.getMainWindow(), as
    ModsList and Battle Observer do), or None before the GUI loader exists."""
    try:
        from helpers import dependency
        from skeletons.gui.impl import IGuiLoader
        loader = dependency.instance(IGuiLoader)
        manager = getattr(loader, 'windowsManager', None)
        return manager.getMainWindow() if manager is not None else None
    except Exception:
        return None


def vehicle_class_tag(tank_id):
    """The class tag (lightTank, ..., SPG) of a vehicle type (items.vehicles VehicleType.classTag, RU 1.45), or None."""
    return getattr(vehicle_type(tank_id), 'classTag', None)


def map_label(arena_type_id):
    """The localized map name, or None."""
    try:
        import ArenaType
        return getattr(ArenaType.g_cache.get(arena_type_id), 'name', None)
    except Exception:
        return None
