# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import re

from ....core.format import COLOR_DOWN, COLOR_MUTED, COLOR_UP, COLOR_WARN

# The client's own ping colour bands (predefined_hosts: LOW <= 59 ms, NORM <= 119 ms, HIGH above).
PING_LOW_MS = 59
PING_NORM_MS = 119
PING_LOW = 'low'
PING_NORM = 'norm'
PING_HIGH = 'high'
PING_GOOD_COLOR = COLOR_UP
PING_NORM_COLOR = COLOR_WARN
PING_BAD_COLOR = COLOR_DOWN
# By band; None is an unknown ping.
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

# «Броня на сайте»: the site's 3D armour page of a tank, /t/<slug>/armor. The server makes the slug from the tank's tag
# (apps/web/server gamedata importer: @sindresorhus/slugify(tag, {decamelize: false})): lower case, '&' as 'and',
# apostrophes dropped, any other run of characters but letters and digits turned into one '-'.
ACTION_ARMOR = 'armor'
ARMOR_PATH = '/t/%s/armor'
SLUG_DROPPED = re.compile(r"['\u2019]")
SLUG_SEPARATORS = re.compile(r'[^a-z0-9]+')

CLOCK_SIZE_STEP = 4
DETAIL_SEPARATOR = u' | '

# The hangar strip's widget (ui-web entities/hud/clock-strip).
STRIP_KIND = 'clock_strip'

# The settings window's editor (docs/specs/2026-09-30-hud-consolidation-and-design.md section 12.3): its field groups
# and the strip it previews, a fixed evening on a busy server.
EDITOR_GROUPS = (
    ('time', ('clock_format', 'date_format')),
    ('server', ('show_server', 'show_ping', 'show_online')),
)
SAMPLE_ID = 'strip'
SAMPLE_MOMENT = (2026, 10, 3, 21, 47, 5, 5, 276, -1)
SAMPLE_INFO = {'server': 'RU5', 'ping': 16, 'online': '5148', 'region_online': ''}
