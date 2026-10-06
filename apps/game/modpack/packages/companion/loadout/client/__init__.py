from __future__ import absolute_import, division, print_function, unicode_literals

from CurrentVehicle import g_currentVehicle

from ....core.log import guarded


def _int_cd(item):
    return getattr(item, 'intCD', None) if item is not None else None


def _installed(layout):
    installed = getattr(layout, 'installed', None)
    if installed is None:
        return []
    try:
        return list(installed)
    except Exception:
        return []


def _items(vehicle, attribute):
    return [_int_cd(item) for item in _installed(getattr(vehicle, attribute, None))]


def _shells(vehicle):
    result = []
    for shell in _installed(getattr(vehicle, 'shells', None)):
        shell_id = _int_cd(shell)
        count = getattr(shell, 'count', None)
        if shell_id is not None and count is not None:
            result.append({'shell_id': shell_id, 'count': count})
    return result


def _modification_names(vehicle):
    # RU 1.45 client source (common/items/vehicles.py): VehicleDescriptor.modifications, the ids of the
    # installed field modifications; vehicles.g_cache.postProgression().modifications maps them to items.
    descriptor = getattr(vehicle, 'descriptor', None)
    ids = getattr(descriptor, 'modifications', None) or ()
    if not ids:
        return []
    try:
        from items import vehicles
        modifications = vehicles.g_cache.postProgression().modifications
    except Exception:
        return []
    names = []
    for modification_id in ids:
        modification = modifications.get(modification_id) if hasattr(modifications, 'get') else None
        name = getattr(modification, 'name', None)
        if name:
            names.append(name)
    return names


def _crew(vehicle):
    result = []
    for entry in getattr(vehicle, 'crew', None) or ():
        tankman = entry[1] if isinstance(entry, tuple) and len(entry) > 1 else entry
        descriptor = getattr(tankman, 'descriptor', None)
        role = getattr(descriptor, 'role', None)
        if not role:
            continue
        skills = getattr(descriptor, 'skills', None) or ()
        result.append({'role': role, 'skills': list(skills)})
    return result


@guarded('read loadout', fallback=(None, None))
def read_current_loadout():
    vehicle = getattr(g_currentVehicle, 'item', None)
    if vehicle is None:
        return None, None
    return _int_cd(vehicle), {
        'optional_devices': _items(vehicle, 'optDevices'),
        'consumables': _items(vehicle, 'consumables'),
        'directives': _items(vehicle, 'battleBoosters'),
        'shells': _shells(vehicle),
        'field_modifications': _modification_names(vehicle),
        'crew': _crew(vehicle),
    }

