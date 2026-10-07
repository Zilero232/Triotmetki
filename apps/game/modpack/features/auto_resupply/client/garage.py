from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import service
from ....core.client.garage import is_locked, run_processor
from ....core.log import guarded
from .constants import PROCESSORS, READERS

# RU 1.45 client source: gui.shared.gui_items.Vehicle isAuto* and processors.vehicle VehicleAuto*Processor.


def _flag(vehicle, name):
    value = getattr(vehicle, name, None)
    if hasattr(value, '__call__'):
        try:
            value = value()
        except Exception:
            return None
    if value is None:
        return None
    return bool(value)


def summary(vehicle):
    return {
        'inv_id': getattr(vehicle, 'invID', None),
        'locked': is_locked(vehicle),
        'flags': {flag: _flag(vehicle, name) for flag, name in READERS.items()},
    }


@guarded('garage vehicles', fallback=[])
def garage_vehicles():
    from skeletons.gui.shared import IItemsCache
    from gui.shared.utils.requesters import REQ_CRITERIA
    return list(service(IItemsCache).items.getVehicles(REQ_CRITERIA.INVENTORY).values())


def _processor(vehicle, flag, value):
    from gui.shared.gui_items.processors import vehicle as processors
    return getattr(processors, PROCESSORS[flag])(vehicle, value)


def send(vehicle, flag, value, done):
    run_processor(lambda: _processor(vehicle, flag, value), done, 'auto resupply %s' % flag)
