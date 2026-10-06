from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: VehicleGunRotator.py. The rotator's private members as Python mangles them.
ROTATOR_MODULE = 'VehicleGunRotator'
ROTATOR_CLASS = 'VehicleGunRotator'
ROTATE_METHOD = '_VehicleGunRotator__rotate'
# The stock tick's turn: __onTick stamps __time, then calls it for __rotate and __updateGunMarker(relax of a tick).
STOCK_TURN_METHOD = 'updateRotationAndGunMarker'
# Read by __rotate as the time the turret and gun models glide over; set on the instance for a frame's turn only.
ROTATION_TICK_ATTR = '_VehicleGunRotator__ROTATION_TICK_LENGTH'
STABILISED_MATRIX_METHOD = 'getAvatarOwnVehicleStabilisedMatrix'
MARKER_METHOD = '_VehicleGunRotator__updateGunMarker'
TIME_ATTR = '_VehicleGunRotator__time'
STARTED_ATTR = '_VehicleGunRotator__isStarted'
CLIENT_MODE_ATTR = '_VehicleGunRotator__clientMode'
SHOT_POINT_ATTR = '_VehicleGunRotator__shotPointSourceFunctor'
TARGET_LAST_ATTR = '_VehicleGunRotator__targetLastShotPoint'
LAST_SHOT_POINT_ATTR = '_VehicleGunRotator__lastShotPoint'

# RU 1.45 client source: Avatar.PlayerAvatar.getOwnVehicleShotDispersionAngle(turretRotationSpeed), which __rotate
# calls for the aiming circle.
AVATAR_MODULE = 'Avatar'
AVATAR_CLASS = 'PlayerAvatar'
DISPERSION_METHOD = 'getOwnVehicleShotDispersionAngle'

# RU 1.45 client source: gui/Scaleform/daapi/view/battle/shared/crosshair/plugins.py, ShotResultIndicatorPlugin: its
# __onGunMarkerStateChanged works out the penetration colour on every marker update.
PLUGINS_MODULE = 'gui.Scaleform.daapi.view.battle.shared.crosshair.plugins'
SHOT_RESULT_PLUGIN = 'ShotResultIndicatorPlugin'
SHOT_RESULT_METHOD = '_ShotResultIndicatorPlugin__onGunMarkerStateChanged'

# constants.AIMING_MODE.TARGET_LOCK: with the auto-aim lock the stock tick predicts the shot point itself.
TARGET_LOCK = 'TARGET_LOCK'
