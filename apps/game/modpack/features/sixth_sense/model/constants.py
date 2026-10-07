from __future__ import absolute_import, division, print_function, unicode_literals

PREVIEW_ELAPSED_S = 3
PREVIEW_SIZE = (160, 110)

ICON_ROOT = 'gui/maps/icons/otmetki/sixth_sense/icons'
ICON_RENDITIONS = (64, 128)
DIM_SUFFIX = '_dim'
GALLERY_ICON_SIZE = 128
IMAGE_SCHEME = 'img://'
PULSE_PERIOD_S = 0.5
# RU 1.45 client text menu.po extraParams/name/vehicleOwnSpottingTime: 10 seconds by default.
LAMP_DURATION_S = 10.0
LAMP_SHOW = 'show'
LAMP_HIDE = 'hide'
# RU 1.45 items/vehicles.py VehicleDescriptor._updateAttributes fills this miscAttrs key.
OWN_SPOTTING_ATTR = 'decreaseOwnSpottingTime'

# RU 1.45 gui/battle_control/battle_constants.VEHICLE_VIEW_STATE names.
OBSERVED = 'observed'
ENDED = 'ended'
VEHICLE_STATES = (
    ('OBSERVED_BY_ENEMY', OBSERVED),
    ('SWITCHING', ENDED),
    ('RESPAWNING', ENDED),
    ('DESTROYED', ENDED),
    ('CREW_DEACTIVATED', ENDED),
)
ENDING_PERIODS = ('AFTERBATTLE',)

KIND = 'sixth_sense'
TIMER_FONT_DECREASE = 6
MIN_TIMER_FONT_SIZE = 8

EDITOR_GROUPS = (
    ('icon', ('icon_set', 'color', 'pulse')),
    ('timer', ('show_timer',)),
)
