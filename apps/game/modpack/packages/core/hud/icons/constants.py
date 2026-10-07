from __future__ import absolute_import, division, print_function, unicode_literals

import re

IMAGE_SCHEME = 'img://'
GLYPH_SCHEME = 'otmetki:'
FALLBACK_SEPARATOR = '|'

# Client images, RU 1.45 (checked in gui-part1/2.pkg of the installed client).
ICONS_ROOT = 'gui/maps/icons'
SHELL_KIND_BATTLE_AMMO = 'battle_ammo'
SHELL_FOLDERS = {SHELL_KIND_BATTLE_AMMO: 'ammopanel/battle_ammo'}
SHELL_FOLDER_SMALL = 'shell/small'
CLASS_TINTS = ('white', 'green', 'red', 'gold')
# vehicleTypes/green and /red spell the two artillery-like classes in lower case.
LOWER_CASE_TINTS = ('green', 'red')
LOWER_CASE_TAGS = ('AT-SPG', 'SPG')
CLASS_TAGS = ('lightTank', 'mediumTank', 'heavyTank', 'AT-SPG', 'SPG')
CLASS_GLYPHS = {
    'lightTank': 'class_light',
    'mediumTank': 'class_medium',
    'heavyTank': 'class_heavy',
    'AT-SPG': 'class_td',
    'SPG': 'class_spg',
}

# BATTLE_LOG_SHELL_TYPES name -> the shell/small file stem (ammopanel names).
SHELL_FILES = {
    'ARMOR_PIERCING': 'ARMOR_PIERCING',
    'ARMOR_PIERCING_HE': 'ARMOR_PIERCING',
    'ARMOR_PIERCING_DF': 'ARMOR_PIERCING_DF',
    'ARMOR_PIERCING_HE_DF': 'ARMOR_PIERCING_DF',
    'ARMOR_PIERCING_CR': 'ARMOR_PIERCING_CR',
    'ARMOR_PIERCING_CR_DF': 'ARMOR_PIERCING_CR',
    'ARMOR_PIERCING_FSDS': 'ARMOR_PIERCING_FSDS',
    'HOLLOW_CHARGE': 'HOLLOW_CHARGE',
    'HOLLOW_CHARGE_DF': 'HOLLOW_CHARGE_DF',
    'HIGH_EXPLOSIVE': 'HIGH_EXPLOSIVE',
    'HE_MODERN': 'HIGH_EXPLOSIVE_MODERN',
    'HE_MODERN_DF': 'HIGH_EXPLOSIVE_MODERN_DF',
    'HE_LEGACY_STUN': 'HIGH_EXPLOSIVE_SPG_STUN',
    'HE_LEGACY_NO_STUN': 'HIGH_EXPLOSIVE',
    'FLAME': 'FLAME',
}
PREMIUM_SHELLS = (
    'ARMOR_PIERCING',
    'ARMOR_PIERCING_CR',
    'ARMOR_PIERCING_FSDS',
    'HOLLOW_CHARGE',
    'HIGH_EXPLOSIVE',
    'HIGH_EXPLOSIVE_MODERN',
)
PREMIUM_SUFFIX = '_PREMIUM'
# The stem of a shell descriptor icon (`descriptor.icon[0]`), the ammopanel file name.
SHELL_STEM = re.compile(r'^[A-Z0-9_]{2,60}(\.png)?\Z')

EFFICIENCY = (
    'damage',
    'armor',
    'help',
    'stun',
    'detection',
    'destruction',
    'fire',
    'ram',
    'module',
    'immobilized',
    'capture',
    'defence',
)

OUTCOME_FILES = {
    'crit': 'hit_critical',
    'no_pen': 'hit_blocked',
    'ricochet': 'hit_ricochet',
    'spaced': 'hit_spaced_armor_blocked',
    'tracks': 'hit_track_blocked',
    'missed_armor': 'hit_miss_armor',
}
OUTCOME_GLYPHS = {
    'pen': 'damage',
    'crit': 'damage',
    'no_pen': 'blocked',
    'ricochet': 'blocked',
    'spaced': 'blocked',
    'tracks': 'track',
    'missed_armor': 'blocked',
}

NATIONS = ('ussr', 'germany', 'usa', 'china', 'france', 'uk', 'japan', 'czech', 'sweden', 'poland', 'italy', 'intunion')
MAX_TIER = 11
MAX_MARKS = 3
ICON_NAME_LIMIT = 80
