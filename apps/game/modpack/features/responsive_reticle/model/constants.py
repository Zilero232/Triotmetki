from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: VehicleGunRotator.__rotate(shotPoint, timeDiff). UNVERIFIED on WG.
ROTATE_ARGUMENTS = ('shotPoint', 'timeDiff')

# constants.SERVER_TICK_LENGTH (RU 1.45 client source): the stock rotator ticks and the server tracks the aim at 10 Hz.
SERVER_TICK_S = 0.1
# UNVERIFIED: BigWorld.callback's order within a frame after the camera's delayCallback(0.0).
FRAME_S = 0.001
# The rotator's own bounds (VehicleGunRotator.__MAX_TIME_DIFF, RU 1.45); a frame shorter than FRAME_S is skipped.
MIN_FRAME_DIFF_S = 0.001
MAX_FRAME_DIFF_S = 0.2

FOLLOW_INSTANT = 'instant'
FOLLOW_SMOOTH = 'smooth'
FOLLOW_MODES = (FOLLOW_INSTANT, FOLLOW_SMOOTH)
SMOOTH_RELAX_S = 0.05
# RU 1.45 VehicleGunRotator.__updateGunMarker: the relax time that lands the marker at once.
INSTANT_RELAX_S = 0.001
STILL_EPS = 1e-05
# VehicleGunRotator.ANGLE_EPS (RU 1.45): a turn smaller than this is no turn.
ANGLE_EPS = 1e-06

# The class tag of self-propelled guns (VehicleType.tags, RU 1.45): their marker is the strategic one.
SPG_TAG = 'SPG'
SKIP_REPLAY = 'replay'
SKIP_ARTILLERY = 'artillery'
SKIP_FIXED_YAW = 'fixed yaw'
