from __future__ import absolute_import, division, print_function, unicode_literals

# The site's public armour page of a tank (apps/web/client app/[locale]/(site)/t/[slug]/armor: the slug may be the
# tank id, the client's intCD); next-intl `localePrefix: 'as-needed'`, so the default locale has no prefix.
SITE_URL = 'https://triotmetki.ru'
ARMOR_PATH = '/t/%d/armor'
SITE_LOCALES = ('ru', 'en')
DEFAULT_LOCALE = 'ru'

OPEN_IN_GAME = 'game'
OPEN_IN_BROWSER = 'browser'
OPEN_IN_CHOICES = (OPEN_IN_GAME, OPEN_IN_BROWSER)

# The carousel tank menu: the in-hangar armour map of that tank, and the site's 3D page.
MENU_OPTION_ID = 'otmetki_armor_view'
MENU_SITE_ID = 'otmetki_armor_view_site'
MENU_OPTIONS = (MENU_OPTION_ID, MENU_SITE_ID)
MENU_LABELS = ((MENU_OPTION_ID, 'armor_view_menu'), (MENU_SITE_ID, 'armor_view_menu_site'))

REFUSAL_OFF = 'armor_view_off'
REFUSAL_BATTLE = 'armor_view_in_battle'
REFUSAL_NO_TANK = 'armor_view_no_tank'

ACTION_HANGAR = 'hangar'
ACTION_SITE = 'site'

MODE_NOMINAL = 'nominal'
MODE_EFFECTIVE = 'effective'
MODE_SHELL = 'shell'
MODES = (MODE_NOMINAL, MODE_EFFECTIVE, MODE_SHELL)

DETAIL_LOW = 'low'
DETAIL_MEDIUM = 'medium'
DETAIL_HIGH = 'high'
DETAILS = (DETAIL_LOW, DETAIL_MEDIUM, DETAIL_HIGH)
# Cell sizes in design pixels of a 1080-pixel-high screen, coarse to fine: the map shows each level when it is
# complete, and a finer level casts rays only near the cells the coarser one found the tank in.
DETAIL_CELLS = {
    DETAIL_LOW: (32, 16),
    DETAIL_MEDIUM: (32, 16, 8),
    DETAIL_HIGH: (32, 16, 8, 4),
}
DESIGN_HEIGHT = 1080
MIN_CELL_PX = 2
# The map reaches this share of the vehicle's projected bounds past each side (the corners of the parts' boxes).
BOX_MARGIN = 0.03
MAX_CELLS = 64 * 1024

# One character per cell: code = tone + PATTERN_STEP * pattern, 0 for no armour.
CELL_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'
PATTERN_STEP = 16
PATTERN_NONE = 0
PATTERN_SCREEN = 1
PATTERN_TRACK = 2
TONE_EMPTY = 0
# Thickness tones 1..12 (nominal and effective modes): the upper bound of each but the last, in mm.
THICKNESS_STOPS = (20, 30, 45, 60, 75, 90, 110, 130, 160, 200, 250)
# Shell tones: always, five chance bands from likely to unlikely, never, ricochet.
TONE_ALWAYS = 1
TONE_NEVER = 7
TONE_RICOCHET = 8
CHANCE_TONES = ((0.8, 2), (0.6, 3), (0.4, 4), (0.2, 5), (0.0, 6))
# Fixed tones: a ray that meets only a screen, a track or the gun.
TONE_SPACED = 13
TONE_TRACK = 14
TONE_GUN = 15

# A camera that moved more than this since the map started invalidates it.
CAMERA_MOVE_M = 0.01
CAMERA_TURN_COS = 0.99998
CAMERA_FOV_RAD = 0.001

DISTANCE_LIMITS = (0, 600)
OPACITY_LIMITS = (20, 90)

# The keys the map answers while it is open (core.client.hotkey Keys names): modes, shells, the attacker.
KEY_ACTIONS = (
    ('KEY_1', 'mode_nominal'),
    ('KEY_2', 'mode_effective'),
    ('KEY_3', 'mode_shell'),
    ('KEY_Q', 'shell_previous'),
    ('KEY_E', 'shell_next'),
    ('KEY_R', 'pin_attacker'),
)
MODE_BY_ACTION = {'mode_nominal': MODE_NOMINAL, 'mode_effective': MODE_EFFECTIVE, 'mode_shell': MODE_SHELL}
SHELL_STEPS = {'shell_previous': -1, 'shell_next': 1}
MODE_KEYS = {MODE_NOMINAL: '1', MODE_EFFECTIVE: '2', MODE_SHELL: '3'}

STATUS_WAITING = 'waiting'
STATUS_BUILDING = 'building'
STATUS_MOVING = 'moving'
STATUS_READY = 'ready'
STATUS_NO_COLLISION = 'no_collision'
STATUS_PAUSED = 'paused'
STATUS_TONES = {
    STATUS_WAITING: 'muted',
    STATUS_BUILDING: 'accent',
    STATUS_MOVING: 'muted',
    STATUS_READY: 'good',
    STATUS_NO_COLLISION: 'bad',
    STATUS_PAUSED: 'muted',
}

VERDICT_TONES = {
    'always': 'good',
    'chance': 'warning',
    'never': 'bad',
    'ricochet': 'bad',
    'no_armour': 'muted',
}

# i18n keys of the shell kinds (constants.SHELL_TYPES names) and of the plate kinds and parts.
SHELL_KIND_KEYS = {
    'ARMOR_PIERCING': 'armor_view_shell_ap',
    'ARMOR_PIERCING_CR': 'armor_view_shell_apcr',
    'ARMOR_PIERCING_FSDS': 'armor_view_shell_apfsds',
    'ARMOR_PIERCING_HE': 'armor_view_shell_aphe',
    'HOLLOW_CHARGE': 'armor_view_shell_heat',
    'HIGH_EXPLOSIVE': 'armor_view_shell_he',
    'FLAME': 'armor_view_shell_flame',
}
PLATE_KIND_KEYS = {
    'main': 'armor_view_plate_main',
    'spaced': 'armor_view_plate_spaced',
    'track': 'armor_view_plate_track',
    'gun': 'armor_view_plate_gun',
}
PART_KEYS = {
    'chassis': 'armor_view_part_chassis',
    'hull': 'armor_view_part_hull',
    'turret': 'armor_view_part_turret',
    'gun': 'armor_view_part_gun',
    'track': 'armor_view_part_track',
}

MAP_KIND = 'armor_map'
LEGEND_KIND = 'armor_legend'
MAX_LEGEND_LAYERS = 6
SEPARATOR = u' \u00b7 '
