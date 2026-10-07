# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import re

ARTY_HIT = 'arty_hit'
TEAM_DAMAGE = 'team_damage'
SPOTTED = 'spotted'
AMMO_RACK = 'ammo_rack'
CREW = 'crew'
TRACKS = 'tracks'
FIRE = 'fire'
FIRE_OUT = 'fire_out'
LOW_HP = 'low_hp'
RAMMED = 'rammed'
FRAG = 'frag'
DAMAGE_MILESTONE = 'damage_milestone'
LAST_ALIVE = 'last_alive'
RELOAD = 'reload'
GREETING = 'greeting'
GG = 'gg'

TRIGGERS = (
    ARTY_HIT, TEAM_DAMAGE, SPOTTED, AMMO_RACK, CREW, TRACKS, FIRE, FIRE_OUT, LOW_HP, RAMMED, FRAG, DAMAGE_MILESTONE,
    LAST_ALIVE, RELOAD, GREETING, GG,
)
DEFAULT_ON = (ARTY_HIT, TEAM_DAMAGE, SPOTTED)

ONCE = None
COOLDOWNS = {
    ARTY_HIT: 30,
    TEAM_DAMAGE: 30,
    SPOTTED: 60,
    AMMO_RACK: 60,
    CREW: 60,
    TRACKS: 30,
    FIRE: 30,
    FIRE_OUT: 30,
    LOW_HP: ONCE,
    RAMMED: 30,
    FRAG: 10,
    DAMAGE_MILESTONE: ONCE,
    LAST_ALIVE: ONCE,
    RELOAD: 30,
    GREETING: ONCE,
    GG: ONCE,
}
RATE_WINDOW_S = 60
RATE_MAX_LINES = 4

TEXT_SUFFIX = '_text'
DEFAULT_TEXT_KEY = 'auto_messages_default_%s'
RESULT_KEY = 'auto_messages_result_%s'
VARIANT_SEPARATOR = '|'
PLACEHOLDER = re.compile(r'\{([a-z_]+)\}')
# RU 1.45 common/messenger_common_chat2.MESSENGER_LIMITS.BATTLE_CHANNEL_MESSAGE_MAX_SIZE.
MAX_LINE_CHARS = 140
MAX_TEMPLATE_CHARS = 600

SOURCE_SHOT = 'shot'
SOURCE_RAM = 'ram'
ATTACKER_SOURCES = ('shot', 'fire', 'ram')
ARTY_CLASS = 'SPG'

# RU 1.45 VEHICLE_VIEW_STATE.DEVICES (name, state, actual state); crew names carry an index (gunner1).
AMMO_RACK_DEVICE = 'ammoBay'
HIT_STATES = ('critical', 'destroyed')
DESTROYED = 'destroyed'
CREW_ROLES = ('commander', 'driver', 'gunner', 'loader', 'radioman')
TRACK_PREFIXES = ('leftTrack', 'rightTrack')

FRESH_RELOAD_S = 1.0

WIN = 'win'
DEFEAT = 'defeat'
DRAW = 'draw'

EDITOR_GROUPS = (
    ('general', ('channel',)),
    (ARTY_HIT, (ARTY_HIT, ARTY_HIT + TEXT_SUFFIX)),
    (TEAM_DAMAGE, (TEAM_DAMAGE, TEAM_DAMAGE + TEXT_SUFFIX)),
    (SPOTTED, (SPOTTED, SPOTTED + TEXT_SUFFIX, 'spotted_allies', 'spotted_extra')),
    (AMMO_RACK, (AMMO_RACK, AMMO_RACK + TEXT_SUFFIX)),
    (CREW, (CREW, CREW + TEXT_SUFFIX)),
    (TRACKS, (TRACKS, TRACKS + TEXT_SUFFIX)),
    (FIRE, (FIRE, FIRE + TEXT_SUFFIX, FIRE_OUT, FIRE_OUT + TEXT_SUFFIX)),
    (LOW_HP, (LOW_HP, LOW_HP + TEXT_SUFFIX, 'low_hp_percent')),
    (RAMMED, (RAMMED, RAMMED + TEXT_SUFFIX)),
    (FRAG, (FRAG, FRAG + TEXT_SUFFIX)),
    (DAMAGE_MILESTONE, (DAMAGE_MILESTONE, DAMAGE_MILESTONE + TEXT_SUFFIX, 'damage_milestone_value')),
    (LAST_ALIVE, (LAST_ALIVE, LAST_ALIVE + TEXT_SUFFIX)),
    (RELOAD, (RELOAD, RELOAD + TEXT_SUFFIX, 'reload_min_s')),
    (GREETING, (GREETING, GREETING + TEXT_SUFFIX, GG, GG + TEXT_SUFFIX)),
)
