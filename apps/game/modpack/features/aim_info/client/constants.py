from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: crosshair/plugins.TargetDistancePlugin.__shouldTrackVehicle keeps the reticle distance only
# for the vehicles whose markers show no distance of their own (and for wrecks); the name is mangled by its class.
TRACK_METHOD = '_TargetDistancePlugin__shouldTrackVehicle'
# consumables_panel.ConsumablesPanel._makeShellTooltip(descriptor, gunSettings, intCD, damageMultiplier): the text of
# a shell slot, built when the slots are added.
SHELL_TOOLTIP_METHOD = '_makeShellTooltip'
# gun_marker_ctrl._DefaultGunMarkerController.update(markerType, pos, direction, sizeVector, relaxTime, collData) ends
# with `_dataProvider.updateSize(size, relaxTime)`; the replay records the size before that, so a replay keeps the
# real one.
MARKER_METHOD = 'update'
MARKER_RELAX_ARG = 4

# RU 1.45 client source: AvatarInputHandler/gun_marker_ctrl.py. createShotResultResolver() is the class the stock
# ShotResultIndicatorPlugin colours the gun marker with (_CrosshairShotResults): getShotResult(hitPoint, collision,
# direction, excludeTeam, piercingMultiplier) is the verdict, and the classmethods below are the steps it takes:
# the plates the own shell's ray meets in the target, the own shell's piercing power at a distance, a plate's armour at
# the hit angle after the shell's normalisation, and whether the shell ricochets off it.
RESOLVER_MODULE = 'AvatarInputHandler.gun_marker_ctrl'
RESOLVER_FACTORY = 'createShotResultResolver'
RESOLVER_VERDICT = 'getShotResult'
RESOLVER_COLLISIONS = '_getAllCollisionDetails'
RESOLVER_PIERCING = '_computePiercingPowerAtDist'
RESOLVER_PLATE = '_computePenetrationArmor'
RESOLVER_RICOCHET = '_shouldRicochet'
RESOLVER_STEPS = (RESOLVER_VERDICT, RESOLVER_COLLISIONS, RESOLVER_PIERCING, RESOLVER_PLATE, RESOLVER_RICOCHET)
# helpers_common.computeDistanceFactor(shell, distance, 'pierceFactor'): the shell's own piercing loss by distance the
# resolver applies after the 100..500 m interpolation.
DISTANCE_FACTOR_MODULE = 'helpers_common'
DISTANCE_FACTOR = 'computeDistanceFactor'
PIERCE_FACTOR = 'pierceFactor'
# aih_constants.SHOT_RESULT: the verdict values by name, and the readout's name of each.
SHOT_RESULT_MODULE = 'aih_constants'
SHOT_RESULT_CLASS = 'SHOT_RESULT'
SHOT_RESULTS = (
    ('NOT_PIERCED', 'not_pierced'),
    ('LITTLE_PIERCED', 'little_pierced'),
    ('GREAT_PIERCED', 'great_pierced'),
)
# CrosshairDataProxy.onGunMarkerStateChanged(markerType, position, direction, collision): the rotator's marker update,
# the event the stock plugin resolves the shot on.
MARKER_STATE_EVENT = 'onGunMarkerStateChanged'
# CrosshairDataProxy.onCrosshairViewChanged(viewID) on every control mode change and
# onCrosshairPositionChanged(x, y) when the reticle moves on the screen (another mode, the arcade aim offset).
VIEW_EVENT = 'onCrosshairViewChanged'
POSITION_EVENT = 'onCrosshairPositionChanged'
# FEEDBACK_EVENT_ID.VEHICLE_ATTRS_CHANGED carries the own vehicle's `gunPiercing` multiplier (the stock plugin keeps
# it for the resolver).
FEEDBACK_MODULE = 'gui.battle_control.battle_constants'
FEEDBACK_EVENT_CLASS = 'FEEDBACK_EVENT_ID'
ATTRS_CHANGED = 'VEHICLE_ATTRS_CHANGED'
GUN_PIERCING = 'gunPiercing'
# Vehicle.Vehicle: the resolver reads only vehicles (and destructible entities, which the readout leaves out).
VEHICLE_MODULE = 'Vehicle'
VEHICLE_CLASS = 'Vehicle'
