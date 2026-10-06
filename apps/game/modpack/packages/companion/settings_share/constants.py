from __future__ import absolute_import, division, print_function, unicode_literals

import re

SETTINGS_PATH = '/mod/settings'
POLL_PATH = '/mod/settings/apply/poll'
RESULT_PATH = '/mod/settings/apply/%s/result'

TARGETS = ('profile', 'private')
RESULT_STATUSES = ('applied', 'rejected')
GROUP_DISPLAY = 'display'
GROUP_CONTROLS = 'controls'
APPLICABLE_GROUPS = (
    GROUP_DISPLAY,
    'camera',
    GROUP_CONTROLS,
    'zoom',
    'sight',
    'markers',
    'minimap',
    'sound',
    'battleUi',
)
SENSITIVITY_PREFIX = 'sensitivity.'
RESOLUTION_FIELDS = ('resolution', 'refreshRate', 'windowMode')

WINDOW_MODES = ('fullscreen', 'borderless', 'windowed')
CLIENTS = ('sd', 'hd')
PRESETS = ('minimum', 'low', 'medium', 'high', 'maximum', 'ultra', 'custom')
GRAPHICS_OPTIONS = ('effects', 'vegetation', 'shadows', 'terrain', 'water', 'lighting', 'textures', 'motionBlur',
                    'tessellation', 'antialiasing', 'decals', 'postProcessing')
ZOOM_STEPS = ('x2', 'x4', 'x8', 'x16', 'x25')
GUN_MARKERS = ('server', 'client')
MARKER_FIELDS = ('icon', 'tier', 'vehicleName', 'playerName', 'hpBar', 'hpValue', 'damage')
TEXT_MAX = 120

RESOLUTION_RE = re.compile(r'^\d{3,5}x\d{3,5}\Z')
# The site's profile slug; anything else is treated as absent, so a server string never reaches a dialog unchecked.
PROFILE_SLUG_RE = re.compile(r'^[a-z0-9-]{1,64}\Z')
UUID_RE = re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\Z')
