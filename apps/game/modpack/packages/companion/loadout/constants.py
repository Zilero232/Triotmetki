from __future__ import absolute_import, division, print_function, unicode_literals

import re

LIMITS = {
    'optional_devices': 4,
    'consumables': 4,
    'directives': 3,
    'shells': 4,
    'shell_count': 1000,
    'field_modifications': 32,
    'crew': 8,
    'skills': 12,
    'gameplay_id': 1023,
}
TAG_PATTERN = re.compile(r'^[A-Za-z0-9_.-]{1,64}\Z')
GAMEPLAY_SHIFT = 16
MAX_TRACKED_ARENAS = 20
