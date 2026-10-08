from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import service
from ....core.client.garage import is_locked

# RU 1.45 client source: gui_items/Vehicle.py optDevices / crew / lastCrew; missing reads as nothing.


def _installed(vehicle):
    return getattr(getattr(vehicle, 'optDevices', None), 'installed', None) or []


def device_state(slot, device):
    if device is None:
        return None
    return {
        'slot': slot,
        'removable': bool(getattr(device, 'isRemovable', False)),
        'int_cd': getattr(device, 'intCD', None),
    }


def summary(vehicle):
    devices = [device_state(slot, device) for slot, device in enumerate(_installed(vehicle))]
    crew = [member for _, member in (getattr(vehicle, 'crew', None) or []) if member is not None]
    return {
        'locked': is_locked(vehicle),
        'devices': devices,
        'crew': len(crew),
        'last_crew': bool(getattr(vehicle, 'lastCrew', None)),
        'style': bool(getattr(vehicle, 'isStyleInstalled', False)),
    }


def device_in(vehicle, slot):
    installed = _installed(vehicle)
    return installed[slot] if 0 <= slot < len(installed) else None


def free_berths():
    # RU 1.45 client source: ItemsRequester.freeTankmenBerthsCount() (BarracksSlotsValidator).
    try:
        from skeletons.gui.shared import IItemsCache
        return int(service(IItemsCache).items.freeTankmenBerthsCount())
    except Exception:
        return None
