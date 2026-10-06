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
# The totals the stock client reports (summary feedback, personal efficiency), in DamageLog.apply_summary order.
SUMMARY_KEYS = ('damage', 'assist', 'blocked', 'stun')
MAX_ENTRIES = 60

OUTCOME_PEN = 'pen'
OUTCOME_CRIT = 'crit'
# The own hit markers (core.battle_tally MARKER_OUTCOMES) a shot row can carry.
OUTCOMES = (OUTCOME_PEN, OUTCOME_CRIT, 'no_pen', 'ricochet', 'spaced', 'tracks', 'missed_armor')
# The markers a damaging shot can carry (feedback_adaptor.__getHitResultEventID, RU 1.45 client source): the others
# (ricochet, spaced armour, tracks, missed armour) come only with damageFactor 0. no_pen takes an HE splash.
DAMAGE_OUTCOMES = ('pen', 'crit', 'no_pen')
# The marker and the damage event of one shot (batched by the server, BATTLE_EVENTS_PROCESSING_TIMEOUT 0.2 s) and its
# crits and HP change arrive within this many seconds of each other, in any order.
MERGE_WINDOW_S = 2.0

# Hits on the player the armour stopped: blocked, and a blocked hit the client drew as a ricochet. The others are damage
# (pen) and a crit without damage.
BLOCKED_OUTCOMES = ('blocked', 'ricochet')
# A hit's crits arrive as a separate RECEIVED_CRIT event right after its damage: they join that row.
RECEIVED_MERGE_WINDOW_S = 1.0
# RU 1.45 common/constants.VEHICLE_HIT_EFFECT.RICOCHETS (INTERMEDIATE_RICOCHET, FINAL_RICOCHET): the hit effect code of
# a shot's last point (Vehicle.showDamageFromShot, VehicleEffects.DamageFromShotDecoder.decodeSegment: the low byte)
# tells a ricochet apart; the own feedback's TANKING does not. The two arrive close together, in either order.
RICOCHET_CODES = (1, 2)

# Where damage came from, as the feedback event's extra tells it (feedback_events._DamageExtra, RU 1.45: isShot /
# isFire / isRam / isWorldCollision / isDeathZone); anything else (artillery strikes, mines, ...) is `other`.
SOURCE_SHOT = 'shot'
SOURCES = (SOURCE_SHOT, 'fire', 'ram', 'world', 'other')
# The own ammo rack reported damaged (the damage panel's DEVICES state 'ammoBay') within this many seconds of a
# received hit marks that hit as the one that reached the ammo rack.
AMMO_RACK_WINDOW_S = 1.5

NOTE_SEPARATOR = ' · '
# The outcomes a note leaves out of its words: a plain penetration and a crit say it with their icon and crits count.
SILENT_OUTCOMES = (None, 'pen', 'crit')
MINUS = '−'
MIN_ENTRY_FONT_SIZE = 8

# The sections a player shows; `both` shows the dealt rows above the received ones (the received nearest the anchor).
SECTIONS = {
    'both': ('dealt', 'received'),
    'dealt': ('dealt',),
    'received': ('received',),
}
# Styles that show only the totals, never the rows (the panel never changes while Alt is held, the owner's decision);
# `minimal` keeps only the dealt and received totals.
COMPACT_STYLES = (STYLE_COMPACT, STYLE_MINIMAL)
MINIMAL_TOTALS = ('dealt', 'received')
# The totals in their order with the section each belongs to (model shown_totals: which are shown).
TOTALS = (
    ('dealt', 'dealt'),
    ('assist', 'dealt'),
    ('stun', 'dealt'),
    ('blocked', 'received'),
    ('received', 'received'),
)
# Per total: the post-battle efficiency icon (None: our glyph), the widget tone and the text line's colour macro.
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
# The icon of a hit on the player by its outcome: our glyph for damage, the hit marker files for the rest.
RECEIVED_ICONS = {
    'pen': ('glyph', 'received'),
    'crit': ('outcome', 'crit'),
    'blocked': ('outcome', 'no_pen'),
    'ricochet': ('outcome', 'ricochet'),
}
SOURCE_ICONS = {'fire': ('efficiency', 'fire'), 'ram': ('efficiency', 'ram'), 'world': ('glyph', 'fall')}
# Shells with a premium label of their own (ОФ-П, КС-П); the other premium shells keep their label in gold.
GOLD_LABELS = ('he', 'heat')

PREVIEW_SIZE = (330, 190)
PREVIEW_STEP_S = 10.0
# (target id, name, class, max HP, outcome, damage, shell, gold, crits, HP left)
PREVIEW_SHOTS = (
    (1, 'Pz. IV', 'mediumTank', 900, 'pen', 390, 'ap', False, 0, 510),
    (2, 'T-34', 'mediumTank', 1100, 'ricochet', None, 'ap', False, 0, None),
    (2, 'T-34', 'mediumTank', 1100, 'ricochet', None, 'ap', False, 0, None),
    (3, 'IS', 'heavyTank', 1500, 'crit', 320, 'apcr', True, 1, 1180),
)
PREVIEW_ASSIST = (3, 'IS', 'heavyTank', 'radio', 480)
# (attacker id, name, class, kind, amount, shell, gold, source)
PREVIEW_RECEIVED = (
    (11, 'IS', 'heavyTank', 'blocked', 240, 'heat', False, 'shot'),
    (12, 'KV-1', 'heavyTank', 'received', 310, 'he', False, 'shot'),
)

# Totals colours of the text lines per palette: (dealt, blocked, assisted, received). graphite is
# @otmetki/design-tokens (accent, steel, gold, danger); colorblind is the Okabe-Ito set.
PALETTES = {
    'classic': ('#E3564A', '#9EC9F5', '#7CD35B', '#F2B25B'),
    'graphite': ('#FF7A1A', '#8EA4B5', '#E8B84A', '#EF5B43'),
    'contrast': ('#FF4040', '#40C0FF', '#80FF40', '#FFD23F'),
    'colorblind': ('#E69F00', '#56B4E9', '#009E73', '#CC79A7'),
}
COLOR_MACROS = ('c_dealt', 'c_blocked', 'c_assisted', 'c_received')
# Text line colours: each kind takes its totals colour (or the player's own colour key when set).
KIND_COLOR = {
    'damage': ('c_dealt', 'color_damage'),
    'radio': ('c_assisted', 'color_assist'),
    'track': ('c_assisted', 'color_assist'),
    'stun': ('c_assisted', 'color_assist'),
    'blocked': ('c_blocked', 'color_blocked'),
    'received': ('c_received', 'color_received'),
}
# The kind glyphs the package ships (assets/assets.json: otmetki_damage_log_icons).
ICON_ROOT = 'gui/maps/icons/otmetki/damage_log/icons'
ICON_RENDITION = 32

KIND = 'damage_log'

# The settings window's editor: the look, which sections and how many lines, then what each row shows.
EDITOR_GROUPS = (
    ('look', ('style', 'palette')),
    ('sections', ('sections', 'dealt_lines', 'received_lines')),
    ('rows', ('group_by_target', 'show_hp', 'show_misses', 'show_received_blocked', 'show_assist_rows', 'show_notes')),
)
