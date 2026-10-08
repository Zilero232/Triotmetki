from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.garage import fresh_vehicle, run_in_order, run_processor
from ..model import is_still_planned
from .vehicle import device_state

# RU 1.45 client source: processors module.getInstallerProcessor, tankman.TankmanUnload / TankmanReturn.


def _installer(vehicle, device, slot):
    from gui.shared.gui_items.processors.module import getInstallerProcessor
    return getInstallerProcessor(vehicle, device, slot, install=False)


def _unload(vehicle):
    from gui.shared.gui_items.processors.tankman import TankmanUnload
    return TankmanUnload(vehicle.invID)


def _return(vehicle):
    from gui.shared.gui_items.processors.tankman import TankmanReturn
    return TankmanReturn(vehicle)


def _style_remover(vehicle):
    # RU 1.45 styled_mode._sellItem :317-323; its CustomizationsSeller is left out (it sells the style).
    from gui.shared.gui_items.processors.common import OutfitApplier
    from items.components.c11n_constants import SeasonType
    from items.customizations import CustomizationOutfit
    from vehicle_outfit.outfit import Outfit
    outfit = Outfit(component=CustomizationOutfit(), vehicleCD=vehicle.descriptor.makeCompactDescr())
    return OutfitApplier(vehicle, ((outfit, SeasonType.ALL),))


def _demount_step(vehicle, planned, device_in):
    slot = planned['slot']

    def make():
        current = fresh_vehicle(vehicle)
        device = device_in(current, slot)
        if not is_still_planned(planned, device_state(slot, device)):
            return None
        return _installer(current, device, slot)
    return make


def demount(vehicle, planned_devices, device_in, done):
    steps = [_demount_step(vehicle, planned, device_in) for planned in planned_devices]
    run_in_order(steps, done, 'demount')


def unload_crew(vehicle, done):
    run_processor(lambda: _unload(vehicle), done, 'crew unload')


def remove_style(vehicle, done):
    run_processor(lambda: _style_remover(vehicle), done, 'style removal')


def return_crew(vehicle, done):
    run_processor(lambda: _return(vehicle), done, 'crew return')
