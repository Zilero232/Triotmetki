from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source (Vehicle.py): the hit effects the client plays on a vehicle. showDamageFromShot(attackerID,
# points, effectsIndex, damageFactor, lastMaterialIsShield) draws a shot; isPlayerVehicle marks the player's own
# vehicle.
VEHICLE_MODULE = 'Vehicle'
VEHICLE_CLASS = 'Vehicle'
SHOT_METHOD = 'showDamageFromShot'
OWN_VEHICLE_ATTR = 'isPlayerVehicle'
# The avatar (BigWorld.player()) names the player's own vehicle entity in playerVehicleID.
BIGWORLD_MODULE = 'BigWorld'
PLAYER_FUNCTION = 'player'
OWN_VEHICLE_ID_ATTR = 'playerVehicleID'
