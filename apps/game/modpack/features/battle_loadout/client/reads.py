from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.client.battle import arena, controls_own_vehicle, optional_devices, player, session_provider
from ....core.log import guarded, log_exception
from .constants import NO_VEHICLE, NOTHING_INSTALLED, SOURCE_ARENA, SOURCE_SETUPS

# RU 1.45 client source: the own vehicle's descriptor in the arena's vehicle list (ClientArena
# vehicles[id]['vehicleType'], what OptionalDevicesController reads through
# vehicle_getter.getOptionalDevicesByVehID), not PlayerAvatar.getVehicleDescriptor(): that is the Vehicle entity's
# descriptor, built from publicInfo.compDescr (entity_defs/Vehicle.def PUBLIC_VEHICLE_INFO, ALL_CLIENTS), which every
# client gets alike and so carries no equipment. VehicleDescriptor.iterOptDevsWithSlots() gives each installed device
# with its slot, in slot order (a device in a slot of one of its categories gets the slot's bonus, SupplySlotFilter's
# plain set intersection), and the stock battle tooltip of a device (gui/shared/tooltips/battle_opt_devices.py) names
# it from artefacts/<tierlessName>/name, its effect from artefacts/<groupName>/battle_descr or the device's
# shortDescriptionSpecial.


def _string(resource):
    from gui.impl import backport
    return backport.text(resource()) if resource.exists() else None


def _texts(device):
    from gui.impl.gen import R

    name = _string(R.strings.artefacts.dyn(device.tierlessName).dyn('name')) or device.userString
    effect = _string(R.strings.artefacts.dyn(device.groupName).dyn('battle_descr'))
    if effect is None:
        special = getattr(device, 'shortDescriptionSpecial', None) or u''
        effect = special.format(colorTagOpen='', colorTagClose='')
    return name, effect


def _trophy(device):
    if getattr(device, 'isUpgraded', False):
        return 'upgraded'
    return 'basic' if getattr(device, 'isUpgradable', False) else None


# The stock consumables panel draws a device the server reports a state for (the camouflage net and the binoculars on,
# the improved configuration spent) from OptionalDevicesController.getOptDeviceInBattle: running while getStatus() is
# set, dimmed when isUsed() (gui/Scaleform/daapi/view/battle/shared/consumables_panel.py _updateOptionalDeviceSlot).
# The controller follows the attached vehicle, so the states are read only while that is the own one.
def _state(device):
    if not controls_own_vehicle():
        return False, False

    controller = optional_devices()
    if controller is None:
        return False, False

    item = controller.getOptDeviceInBattle(device.id[1])
    if item is None:
        return False, False
    return bool(item.getStatus()), bool(item.isUsed())


def _device(device, slot, boosted):
    name, effect = _texts(device)
    is_active, is_used = _state(device)
    slot_categories = set(getattr(slot, 'categories', None) or ())
    device_categories = set(getattr(device, 'categories', None) or ())
    return {
        'name': name,
        'effect': effect,
        'icon': getattr(device, 'icon', None),
        'bonus': bool(slot_categories & device_categories),
        'deluxe': bool(getattr(device, 'isDeluxe', False)),
        'modernized': bool(getattr(device, 'isModernized', False)),
        'level': getattr(device, 'level', None),
        'trophy': _trophy(device),
        'boosted': device.compactDescr in boosted,
        'active': is_active,
        'used': is_used,
    }


# The own vehicle the way the battle builds it for its own ammunition panel (RU 1.45
# gui/impl/battle/battle_page/ammunition_panel/respawn_ammunition_panel_inject.py _updateGuiVehicle with
# gui/battle_control/gui_vehicle_builder.py VehicleBuilder) from the own Vehicle entity's MY_VEHICLE properties
# (entity_defs/Vehicle.def: setups, setupsIndexes, crewCompactDescrs, customRoleSlotTypeId, vehPostProgression,
# disabledSwitches). Vehicle.__init__ reads the role slot from the extra data (veh_post_progression_controller
# processVehExtData), so the builder needs it, and the arena's modifiers the way PrebattleSetupsController passes them.
def _gui_vehicle(descriptor):
    from gui.battle_control.gui_vehicle_builder import VehicleBuilder

    entity = BigWorld.entity(player().playerVehicleID)
    if entity is None or getattr(entity, 'setups', None) is None:
        return None

    compact_descr = descriptor.makeCompactDescr()
    builder = VehicleBuilder()
    builder.setStrCD(compact_descr)
    builder.setShells(compact_descr, entity.setups)
    builder.setCrew(list(entity.crewCompactDescrs))
    builder.setAmmunitionSetups(entity.setups, dict(entity.setupsIndexes or {}))
    builder.setRoleSlot(entity.customRoleSlotTypeId)
    builder.setPostProgressionState(list(entity.vehPostProgression), list(entity.disabledSwitches))
    builder.setModifiers(session_provider().arenaVisitor.getArenaModifiers())
    return builder.getResult()


def _booster_effect(booster, vehicle, is_replace):
    if booster.isCrewBooster():
        return booster.getCrewBoosterDescription(is_replace)
    if booster.isEquipmentBooster():
        return booster.getOptDeviceBoosterDescription(vehicle)
    return booster.shortDescription


def _booster_attention(booster, vehicle):
    from gui.impl.lobby.tank_setup.tank_setup_helper import isEconomicDirBattleEnabled

    if booster.isEconomicBooster():
        return not isEconomicDirBattleEnabled(session_provider())
    return not booster.isAffectsOnVehicle(vehicle)


# A directive the way the garage ammunition panel shows it (gui/impl/common/ammunition_panel/ammunition_panel_blocks.py
# BattleBoostersBlock._updateOverlayAspects): its frame, the replace frame for a crew directive standing in for a skill
# the crew has not learnt, and the attention mark when it does not affect the vehicle (BattleBooster.isAffectsOnVehicle)
# or is an economic directive in a battle without them (tank_setup_helper.isEconomicDirBattleEnabled). Its effect is the
# text the garage tooltip builds (gui/shared/gui_items/artefacts.py BattleBooster descriptions).
def _booster(booster, vehicle):
    is_unlearnt_skill = booster.isCrewBooster() and not booster.isAffectedSkillLearnt(vehicle)
    is_replace = is_unlearnt_skill and not booster.isBuiltinPerkBooster()
    return {
        'name': booster.userName,
        'effect': _booster_effect(booster, vehicle, is_replace),
        'icon': booster.descriptor.iconName,
        'booster': 'replace' if is_replace else 'boost',
        'attention': _booster_attention(booster, vehicle),
    }


def _is_boosted(device, boosters):
    return any(booster.isOptionalDeviceCompatible(device) for booster in boosters)


def _boosted(boosters, vehicle):
    devices = vehicle.optDevices.installed.getItems()
    return set(device.intCD for device in devices if _is_boosted(device, boosters))


# Every directive slot of the setup, None where it is empty (vehicle_equipment EMPTY_ITEM), so the row keeps its cells.
def _directives(vehicle):
    installed = vehicle.battleBoosters.installed
    boosters = installed.getItems()
    directives = [_booster(booster, vehicle) if booster else None for booster in installed]
    return _boosted(boosters, vehicle), directives


# The devices of the setup the player took into the battle, the way PrebattleSetupsController.__updateGuiVehicle syncs
# its own vehicle (RU 1.45 gui/battle_control/controllers/prebattle_setups_ctrl.py): the descriptor gets the installed
# sequence of the GUI vehicle's setup (optDevices.installed.getIntCDs(), 0 for an empty slot). The arena's descriptor
# can lag behind a setup switch.
def _setup_descriptor(vehicle):
    descriptor = vehicle.descriptor
    descriptor.installOptDevsSequence(vehicle.optDevices.installed.getIntCDs())
    return descriptor


# The descriptor's own device alone (its name and icon), for when the stock texts or the battle state cannot be read:
# the row still shows every installed device.
def _plain_device(device):
    return {'name': device.userString, 'effect': u'', 'icon': getattr(device, 'icon', None)}


def _read_device(device, slot, boosted):
    if device is None:
        return None
    try:
        return _device(device, slot, boosted)
    except Exception:
        log_exception('battle loadout: device details')
        return _plain_device(device)


def _slots(descriptor):
    return [(device, slot) for device, slot in descriptor.iterOptDevsWithSlots()]


def _own_descriptor():
    vehicles = getattr(arena(), 'vehicles', None) or {}
    info = vehicles.get(getattr(player(), 'playerVehicleID', None)) or {}
    return info.get('vehicleType')


def _empty(reason):
    return {'devices': [], 'directives': [], 'reason': reason, 'source': None, 'slots': []}


# The directive slots of the vehicle, empty, while its setups cannot be read: the descriptor's supply slots hold them
# (RU 1.45 items/vehicles.py VehicleType supply slots, what vehicle_equipment's collectors size their layouts by).
def _directive_slots(descriptor):
    return set(), [None] * _directive_amount(descriptor)


@guarded('battle loadout: directive slots', fallback=0)
def _directive_amount(descriptor):
    from items import EQUIPMENT_TYPES, ITEM_TYPES

    return descriptor.supplySlots.getAmountForType(ITEM_TYPES.equipment, EQUIPMENT_TYPES.battleBoosters)


@guarded('battle loadout: own setups')
def _own_vehicle(descriptor):
    return _gui_vehicle(descriptor)


@guarded('battle loadout: setup devices', fallback=(None, (set(), [])))
def _setup_slots(vehicle):
    return _slots(_setup_descriptor(vehicle)), _directives(vehicle)


def own_loadout():
    descriptor = _own_descriptor()
    if descriptor is None:
        return _empty(NO_VEHICLE)

    vehicle = _own_vehicle(descriptor)
    slots, (boosted, directives) = _setup_slots(vehicle) if vehicle is not None else (None, (set(), []))
    source = SOURCE_SETUPS if slots is not None else SOURCE_ARENA
    if slots is None:
        slots = _slots(descriptor)
        boosted, directives = _directive_slots(descriptor)

    devices = [_read_device(device, slot, boosted) for device, slot in slots]
    installed = [item for item in devices + directives if item is not None]
    return {
        'devices': devices,
        'directives': directives,
        'reason': None if installed else NOTHING_INSTALLED,
        'source': source,
        'slots': [device.compactDescr if device is not None else 0 for device, _ in slots],
    }
