from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.client.battle import arena, controls_own_vehicle, optional_devices, player, session_provider
from ....core.log import guarded, log_exception
from .constants import NO_VEHICLE, NOTHING_INSTALLED, SOURCE_ARENA, SOURCE_SETUPS

# RU 1.45 client source: ClientArena vehicles[id]['vehicleType'], not PlayerAvatar.getVehicleDescriptor().


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


# RU 1.45 client source: OptionalDevicesController.getOptDeviceInBattle, as consumables_panel.py draws it.
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


# RU 1.45 respawn_ammunition_panel_inject.py _updateGuiVehicle with gui_vehicle_builder.VehicleBuilder.
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


# RU 1.45 ammunition_panel_blocks.py BattleBoostersBlock._updateOverlayAspects.
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


def _directives(vehicle):
    installed = vehicle.battleBoosters.installed
    boosters = installed.getItems()
    directives = [_booster(booster, vehicle) if booster else None for booster in installed]
    return _boosted(boosters, vehicle), directives


# RU 1.45 gui/battle_control/controllers/prebattle_setups_ctrl.py __updateGuiVehicle.
def _setup_descriptor(vehicle):
    descriptor = vehicle.descriptor
    descriptor.installOptDevsSequence(vehicle.optDevices.installed.getIntCDs())
    return descriptor


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


# RU 1.45 items/vehicles.py VehicleType supply slots hold the directive slots.
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
