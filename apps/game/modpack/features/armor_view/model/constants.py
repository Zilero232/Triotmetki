from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.armor import KIND_GUN, KIND_SPACED, KIND_TRACK, VERDICT_ALWAYS, VERDICT_NEVER, VERDICT_RICOCHET

# The site's public armour page of a tank (apps/web/client app/[locale]/(site)/t/[slug]/armor: the slug may be the
# tank id, the client's intCD); next-intl `localePrefix: 'as-needed'`, so the default locale has no prefix.
SITE_URL = 'https://triotmetki.ru'
ARMOR_PATH = '/t/%d/armor'
SITE_LOCALES = ('ru', 'en')
DEFAULT_LOCALE = 'ru'

# The carousel tank menu item: the armour screen on that tank.
MENU_OPTION_ID = 'otmetki_armor_view'
MENU_LABEL = 'armor_view_menu'

REFUSAL_OFF = 'armor_view_off'
REFUSAL_BATTLE = 'armor_view_in_battle'
REFUSAL_NO_TANK = 'armor_view_no_tank'
REFUSAL_NO_SCREEN = 'armor_view_no_screen'

ACTION_OPEN = 'open'
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
DISTANCE_STEP = 10
OPACITY_LIMITS = (20, 90)

STATUS_WAITING = 'waiting'
STATUS_LOADING = 'loading'
STATUS_BUILDING = 'building'
STATUS_MOVING = 'moving'
STATUS_READY = 'ready'
STATUS_NO_COLLISION = 'no_collision'
STATUS_TONES = {
    STATUS_WAITING: 'muted',
    STATUS_LOADING: 'muted',
    STATUS_BUILDING: 'accent',
    STATUS_MOVING: 'muted',
    STATUS_READY: 'good',
    STATUS_NO_COLLISION: 'bad',
}
PROGRESS_STEPS = 20

CELL_VERDICT_TONES = {
    VERDICT_ALWAYS: TONE_ALWAYS,
    VERDICT_NEVER: TONE_NEVER,
    VERDICT_RICOCHET: TONE_RICOCHET,
}
FIXED_TONES = {KIND_SPACED: TONE_SPACED, KIND_TRACK: TONE_TRACK, KIND_GUN: TONE_GUN}
PATTERNS = {KIND_SPACED: PATTERN_SCREEN, KIND_GUN: PATTERN_SCREEN, KIND_TRACK: PATTERN_TRACK}

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

KIND_ENTRIES = (
    (TONE_SPACED, 0, 'armor_view_legend_spaced'),
    (TONE_TRACK, 0, 'armor_view_legend_track'),
    (TONE_GUN, 0, 'armor_view_legend_gun'),
    (0, PATTERN_SCREEN, 'armor_view_legend_behind_screen'),
    (0, PATTERN_TRACK, 'armor_view_legend_behind_track'),
)
NEIGHBOURS = (
    (-1, -1), (-1, 0), (-1, 1),
    (0, -1), (0, 0), (0, 1),
    (1, -1), (1, 0), (1, 1),
)
FRACTION_DIGITS = 5
MAX_READOUT_LAYERS = 6

# The tank picker: the own garage first; a search runs over every tank the tech tree and the shop list.
MAX_QUERY_CHARS = 40
SEARCH_LIMIT = 40
# RU 1.45 gui.shared.gui_items.Vehicle flags of tanks no player can inspect in the tech tree or the shop (bots, event
# and observer vehicles, hidden ones), the same the stock REQ_CRITERIA.VEHICLE filters read.
UNLISTED_FLAGS = ('is_hidden', 'is_event', 'is_observer', 'is_bot')

# Camera presets around the hangar tank: (id, yaw from the tank's nose in degrees, pitch in degrees). A preset looks
# along its yaw, so 'front' looks back at the nose. UNVERIFIED on Lesta 1.45: the pitch sign of
# HangarCameraManager.moveCamera (hit_viewer passes the negated pitch of a downward shell path), the python.log line
# 'armor view: camera <preset>' gives the values sent.
CAMERA_FRONT = 'front'
CAMERA_PRESETS = (
    (CAMERA_FRONT, 180.0, 12.0),
    ('front_30', 150.0, 12.0),
    ('side', 90.0, 8.0),
    ('rear', 0.0, 12.0),
    ('top', 180.0, 75.0),
)
# The camera stands this many hull box diagonals away, within these metres; the orbit then keeps these limits until the
# screen closes (core.client.hangar_preview resets the camera).
CAMERA_DISTANCE_FACTOR = 1.5
CAMERA_DISTANCE_M = (5.0, 14.0)
CAMERA_ORBIT_M = (3.0, 18.0)
CAMERA_FLY_S = 0.6

# The page's messages: command -> its fields.
COMMAND_READY = 'ready'
COMMAND_CLOSE = 'close'
COMMAND_MOVE = 'move'
COMMAND_HOVER = 'hover'
COMMAND_LEAVE = 'leave'
COMMAND_MODE = 'mode'
COMMAND_SHELL = 'shell'
COMMAND_DISTANCE = 'distance'
COMMAND_TANK = 'tank'
COMMAND_MODULES = 'modules'
COMMAND_ATTACKER = 'attacker'
COMMAND_SEARCH = 'search'
COMMAND_CAMERA = 'camera'
COMMAND_SITE = 'site'
COMMAND_DIAG = 'diag'
COMMANDS = {
    COMMAND_READY: (),
    COMMAND_CLOSE: (),
    COMMAND_MOVE: ('dx', 'dy', 'dz'),
    COMMAND_HOVER: ('x', 'y'),
    COMMAND_LEAVE: (),
    COMMAND_MODE: ('mode',),
    COMMAND_SHELL: ('index',),
    COMMAND_DISTANCE: ('m',),
    COMMAND_TANK: ('cd',),
    COMMAND_MODULES: ('turret', 'gun'),
    COMMAND_ATTACKER: ('cd',),
    COMMAND_SEARCH: ('text',),
    COMMAND_CAMERA: ('preset',),
    COMMAND_SITE: (),
    COMMAND_DIAG: ('text',),
}
MAX_MESSAGE_CHARS = 2048
# One python.log line for the first hover ray and then for every this many.
HOVER_LOG_EVERY = 200

# The page's own strings: (state key, i18n key).
PAGE_LABELS = (
    ('title', 'armor_view_title'),
    ('close', 'armor_view_close'),
    ('garage', 'armor_view_garage'),
    ('search', 'armor_view_search'),
    ('no_matches', 'armor_view_no_matches'),
    ('turret', 'armor_view_turret'),
    ('gun', 'armor_view_gun'),
    ('versus', 'armor_view_versus'),
    ('attacker', 'armor_view_attacker'),
    ('this_tank', 'armor_view_this_tank'),
    ('shells', 'armor_view_shells'),
    ('no_shells', 'armor_view_no_shells'),
    ('distance', 'armor_view_distance_label'),
    ('metres', 'armor_view_metres'),
    ('legend', 'armor_view_legend'),
    ('camera', 'armor_view_camera'),
    ('site', 'armor_view_site'),
    ('site_hint', 'armor_view_site_hint'),
    ('hint', 'armor_view_hint'),
    ('tier', 'armor_view_tier'),
)
