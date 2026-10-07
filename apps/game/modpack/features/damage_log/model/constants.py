# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ..settings.constants import STYLE_COMPACT, STYLE_MINIMAL

KIND_DAMAGE = 'damage'
KIND_RADIO = 'radio'
KIND_TRACK = 'track'
KIND_STUN = 'stun'
KIND_BLOCKED = 'blocked'
KIND_RECEIVED = 'received'
KIND_CRIT = 'crit'
KIND_RECEIVED_CRIT = 'received_crit'
KINDS = (KIND_DAMAGE, KIND_RADIO, KIND_TRACK, KIND_STUN, KIND_BLOCKED, KIND_RECEIVED)
ASSIST_KINDS = ('radio', 'track', 'stun')
SUMMARY_KEYS = ('damage', 'assist', 'blocked', 'stun')
MAX_ENTRIES = 60

OUTCOME_PEN = 'pen'
OUTCOME_CRIT = 'crit'
OUTCOMES = (OUTCOME_PEN, OUTCOME_CRIT, 'no_pen', 'ricochet', 'spaced', 'tracks', 'missed_armor')
# RU 1.45 client source: feedback_adaptor.__getHitResultEventID.
DAMAGE_OUTCOMES = ('pen', 'crit', 'no_pen')
# The server batches a shot's events (BATTLE_EVENTS_PROCESSING_TIMEOUT 0.2 s).
MERGE_WINDOW_S = 2.0

BLOCKED_OUTCOMES = ('blocked', 'ricochet')
RECEIVED_MERGE_WINDOW_S = 1.0
# RU 1.45 common/constants.VEHICLE_HIT_EFFECT.RICOCHETS, the low byte of the last point's effect code.
RICOCHET_CODES = (1, 2)

# RU 1.45 feedback_events._DamageExtra: isShot / isFire / isRam / isWorldCollision / isDeathZone.
SOURCE_SHOT = 'shot'
SOURCES = (SOURCE_SHOT, 'fire', 'ram', 'world', 'other')
AMMO_RACK_WINDOW_S = 1.5

NOTE_SEPARATOR = ' · '
SILENT_OUTCOMES = (None, 'pen', 'crit')
MINUS = '−'
MIN_ENTRY_FONT_SIZE = 8

SECTIONS = {
    'both': ('dealt', 'received'),
    'dealt': ('dealt',),
    'received': ('received',),
}
COMPACT_STYLES = (STYLE_COMPACT, STYLE_MINIMAL)
MINIMAL_TOTALS = ('dealt', 'received')
TOTALS = (
    ('dealt', 'dealt'),
    ('assist', 'dealt'),
    ('stun', 'dealt'),
    ('blocked', 'received'),
    ('received', 'received'),
)
COUNTED_ONLY_TOTALS = ('stun',)
TOTAL_ICONS = {'dealt': 'damage', 'assist': 'help', 'stun': 'stun', 'blocked': 'armor', 'received': None}
TOTAL_TONES = {'dealt': 'accent', 'assist': 'radio', 'stun': 'stun', 'blocked': 'blocked', 'received': 'received'}
TOTAL_COLORS = {
    'dealt': 'c_dealt',
    'assist': 'c_assisted',
    'stun': 'c_assisted',
    'blocked': 'c_blocked',
    'received': 'c_received',
}
TOTALS_SEPARATOR = '   '
COMPACT_TOTALS_SEPARATOR = ' / '
KIND_TONES = {
    'damage': 'accent',
    'radio': 'radio',
    'track': 'track',
    'stun': 'stun',
    'blocked': 'blocked',
    'received': 'received',
}
RECEIVED_ICONS = {
    'pen': ('glyph', 'received'),
    'crit': ('outcome', 'crit'),
    'blocked': ('outcome', 'no_pen'),
    'ricochet': ('outcome', 'ricochet'),
}
SOURCE_ICONS = {'fire': ('efficiency', 'fire'), 'ram': ('efficiency', 'ram'), 'world': ('glyph', 'fall')}
GOLD_LABELS = ('he', 'heat')

PREVIEW_SIZE = (336, 132)
PREVIEW_STEP_S = 10.0
PREVIEW_SHOTS = (
    (1, 'Pz. IV', 'mediumTank', 900, 'pen', 390, 'ap', False, 0, 510),
    (2, 'T-34', 'mediumTank', 1100, 'ricochet', None, 'ap', False, 0, None),
    (2, 'T-34', 'mediumTank', 1100, 'ricochet', None, 'ap', False, 0, None),
    (3, 'IS', 'heavyTank', 1500, 'crit', 320, 'apcr', True, 1, 1180),
)
PREVIEW_ASSIST = (3, 'IS', 'heavyTank', 'radio', 480)
PREVIEW_RECEIVED = (
    (11, 'IS', 'heavyTank', 'blocked', 240, 'heat', False, 'shot'),
    (12, 'KV-1', 'heavyTank', 'received', 310, 'he', False, 'shot'),
)

PALETTES = {
    'classic': ('#E3564A', '#9EC9F5', '#7CD35B', '#F2B25B'),
    'graphite': ('#FF7A1A', '#8EA4B5', '#E8B84A', '#EF5B43'),
    'contrast': ('#FF4040', '#40C0FF', '#80FF40', '#FFD23F'),
    'colorblind': ('#E69F00', '#56B4E9', '#009E73', '#CC79A7'),
}
COLOR_MACROS = ('c_dealt', 'c_blocked', 'c_assisted', 'c_received')
KIND_COLOR = {
    'damage': ('c_dealt', 'color_damage'),
    'radio': ('c_assisted', 'color_assist'),
    'track': ('c_assisted', 'color_assist'),
    'stun': ('c_assisted', 'color_assist'),
    'blocked': ('c_blocked', 'color_blocked'),
    'received': ('c_received', 'color_received'),
}
ICON_ROOT = 'gui/maps/icons/otmetki/damage_log/icons'
ICON_RENDITION = 32

KIND = 'damage_log'

EDITOR_GROUPS = (
    ('look', ('style', 'palette')),
    ('sections', ('sections', 'dealt_lines', 'received_lines')),
    ('rows', ('group_by_target', 'show_hp', 'show_misses', 'show_received_blocked', 'show_assist_rows', 'show_notes')),
)
