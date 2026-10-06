from __future__ import absolute_import, division, print_function, unicode_literals

# The arguments of VehicleGunRotator.__rotate after self. RU 1.45 client source: (shotPoint, timeDiff). UNVERIFIED on
# WG: the same two names are expected there; any other signature keeps the component off.
ROTATE_ARGUMENTS = ('shotPoint', 'timeDiff')

# constants.SERVER_TICK_LENGTH (RU 1.45 client source): the stock rotator ticks and the server tracks the aim at 10 Hz.
SERVER_TICK_S = 0.1
# The marker's own tick: BigWorld.callback fires on the first frame after its delay, so 1 ms is every frame, due after
# the camera's own delayCallback(0.0) update of the shot point (UNVERIFIED: BigWorld's order within a frame).
FRAME_S = 0.001
# The rotator's own bounds (VehicleGunRotator.__MAX_TIME_DIFF, RU 1.45); a frame shorter than FRAME_S is skipped.
MIN_FRAME_DIFF_S = 0.001
MAX_FRAME_DIFF_S = 0.2

# How the marker reaches its new place: at once, or over half a server tick (a lag of its own, 50 ms).
FOLLOW_INSTANT = 'instant'
FOLLOW_SMOOTH = 'smooth'
FOLLOW_MODES = (FOLLOW_INSTANT, FOLLOW_SMOOTH)
SMOOTH_RELAX_S = 0.05
# RU 1.45 VehicleGunRotator.__updateGunMarker: the relax time it gives the marker to land at once (a replay time warp).
# A relax as long as the frame would leave the marker drawn at its old place for that frame.
INSTANT_RELAX_S = 0.001
# A frame whose shot point and own vehicle stay within this (metres, radians) of the last frame's, with the gun already
# turned to it, is left to the stock tick: there is nothing to turn and the marker would not move.
STILL_EPS = 1e-05
# VehicleGunRotator.ANGLE_EPS (RU 1.45): a turn smaller than this is no turn.
ANGLE_EPS = 1e-06

# The class tag of self-propelled guns (VehicleType.tags, RU 1.45): their marker is the strategic one.
SPG_TAG = 'SPG'
SKIP_REPLAY = 'replay'
SKIP_ARTILLERY = 'artillery'
SKIP_FIXED_YAW = 'fixed yaw'
