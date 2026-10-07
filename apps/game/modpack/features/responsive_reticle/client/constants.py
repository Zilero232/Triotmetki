from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: VehicleGunRotator.py. The rotator's private members as Python mangles them.
ROTATOR_MODULE = 'VehicleGunRotator'
ROTATOR_CLASS = 'VehicleGunRotator'
ROTATE_METHOD = '_VehicleGunRotator__rotate'
# The stock tick: __onTick stamps __time, then calls __rotate and __updateGunMarker.
STOCK_TURN_METHOD = 'updateRotationAndGunMarker'
# Read by __rotate as the time the turret and gun models glide over.
ROTATION_TICK_ATTR = '_VehicleGunRotator__ROTATION_TICK_LENGTH'
STABILISED_MATRIX_METHOD = 'getAvatarOwnVehicleStabilisedMatrix'
MARKER_METHOD = '_VehicleGunRotator__updateGunMarker'
TIME_ATTR = '_VehicleGunRotator__time'
STARTED_ATTR = '_VehicleGunRotator__isStarted'
CLIENT_MODE_ATTR = '_VehicleGunRotator__clientMode'
SHOT_POINT_ATTR = '_VehicleGunRotator__shotPointSourceFunctor'
TARGET_LAST_ATTR = '_VehicleGunRotator__targetLastShotPoint'
LAST_SHOT_POINT_ATTR = '_VehicleGunRotator__lastShotPoint'

# RU 1.45 client source: Avatar.PlayerAvatar.getOwnVehicleShotDispersionAngle(turretRotationSpeed).
AVATAR_MODULE = 'Avatar'
AVATAR_CLASS = 'PlayerAvatar'
DISPERSION_METHOD = 'getOwnVehicleShotDispersionAngle'

# RU 1.45 client source: crosshair/plugins.py ShotResultIndicatorPlugin.__onGunMarkerStateChanged.
PLUGINS_MODULE = 'gui.Scaleform.daapi.view.battle.shared.crosshair.plugins'
SHOT_RESULT_PLUGIN = 'ShotResultIndicatorPlugin'
SHOT_RESULT_METHOD = '_ShotResultIndicatorPlugin__onGunMarkerStateChanged'

# constants.AIMING_MODE.TARGET_LOCK: with the auto-aim lock the stock tick predicts the shot point itself.
TARGET_LOCK = 'TARGET_LOCK'
