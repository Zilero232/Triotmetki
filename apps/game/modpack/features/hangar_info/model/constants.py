# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import re

from ....core.format import COLOR_DOWN, COLOR_MUTED, COLOR_UP, COLOR_WARN

# The client's ping bands (predefined_hosts: LOW <= 59 ms, NORM <= 119 ms, HIGH above).
PING_LOW_MS = 59
PING_NORM_MS = 119
PING_LOW = 'low'
PING_NORM = 'norm'
PING_HIGH = 'high'
PING_GOOD_COLOR = COLOR_UP
PING_NORM_COLOR = COLOR_WARN
PING_BAD_COLOR = COLOR_DOWN
PING_COLORS = {
    PING_LOW: PING_GOOD_COLOR,
    PING_NORM: PING_NORM_COLOR,
    PING_HIGH: PING_BAD_COLOR,
    None: COLOR_MUTED,
}
PING_TONES = {
    PING_LOW: 'good',
    PING_NORM: 'warning',
    PING_HIGH: 'bad',
    None: 'muted',
}

ACTION_ARMOR = 'armor'
ARMOR_PATH = '/t/%s/armor'
SLUG_DROPPED = re.compile(r"['\u2019]")
SLUG_SEPARATORS = re.compile(r'[^a-z0-9]+')

CLOCK_SIZE_STEP = 4
DETAIL_SEPARATOR = u' | '

STRIP_KIND = 'clock_strip'

EDITOR_GROUPS = (
    ('time', ('clock_format', 'date_format')),
    ('server', ('show_server', 'show_ping', 'show_online')),
)
SAMPLE_ID = 'strip'
SAMPLE_MOMENT = (2026, 10, 3, 21, 47, 5, 5, 276, -1)
SAMPLE_INFO = {'server': 'RU5', 'ping': 16, 'online': '5148', 'region_online': ''}
