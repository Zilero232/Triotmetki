from __future__ import absolute_import, division, print_function, unicode_literals

import re

INDEX_FILE = 'replay_manager_%d.json'
INDEX_MAX = 500
FAVOURITES_MAX = 1000
LIBRARY_FILE = 'replay_manager_headers.json'
LIBRARY_VERSION = 2

NAME_MAX_CHARS = 100
SCAN_MAX_FILES = 1000
FORBIDDEN_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')
RESERVED_NAMES = (
    ('con', 'prn', 'aux', 'nul')
    + tuple('com%d' % number for number in range(1, 10))
    + tuple('lpt%d' % number for number in range(1, 10))
)

SCAN_EVERY_S = 3.0
INDEX_BUDGET_S = 0.008
INDEX_FRAME_S = 0.0
INDEX_WANTED_S = 5.0

ACTION_FOLDER = 'open_folder'
ACTION_RENAME = 'rename'
ACTION_DELETE = 'delete'
ACTION_FAVOURITE = 'favourite'
ACTION_PLAY = 'play'
ACTION_UPLOAD = 'upload'
ACTION_HITS = 'hits'

PAGE_KIND = 'replays'
STATUS_READY = 'ready'
STATUS_INDEXING = 'indexing'
STATUS_NO_ACCOUNT = 'no_account'

SITE_REPLAY_PATH = '/replays/%s'

SITE_QUEUED = 'queued'
SITE_UPLOADED = 'uploaded'
SITE_ANALYSED = 'analysed'

UPLOAD_READY = 'ready'
UPLOAD_MISSING = 'missing'

ERROR_NAME = 'name'
ERROR_EXISTS = 'exists'
ERROR_MISSING = 'missing'
ERROR_VERSION = 'version'
ERROR_BATTLE = 'battle'
ERROR_PLAYING = 'playing'
ERROR_UNAVAILABLE = 'unavailable'
ERROR_NO_ARENA = 'no_arena'
ERROR_PATH = 'path'

# RU 1.45 client source: BattleReplay :235 and :1030 compare clientVersionFromExe.
VERSION_PARTS = 4
VERSION_SPLIT = re.compile(r'[^0-9]+')

AUTO_NAME_SETTLE_S = 10
AUTO_NAME_GIVE_UP_S = 30 * 60
AUTO_NAME_MATCH_S = 5 * 60
EXACT_MATCH = -1.0
AUTO_NAME_CHECK_S = 15
AUTO_NAME_INDEX_S = 0.02

RESULTS = ('win', 'loss', 'draw')

# constants.ARENA_BONUS_TYPE (RU 1.45 client source, common/constants.py:247) -> the battle kinds the filter shows.
BATTLE_TYPES = {
    1: 'random',
    24: 'random',
    2: 'training',
    25: 'training',
    28: 'training',
    38: 'training',
    4: 'tournament',
    14: 'tournament',
    15: 'tournament',
    31: 'tournament',
    47: 'tournament',
    5: 'clan',
    13: 'clan',
    20: 'clan',
    21: 'clan',
    7: 'team',
    22: 'ranked',
    27: 'frontline',
    43: 'comp7',
    29: 'royale',
    30: 'royale',
    34: 'royale',
    35: 'royale',
    9: 'event',
    26: 'event',
    32: 'event',
    33: 'event',
    36: 'event',
    37: 'event',
    42: 'event',
    50: 'event',
}
OTHER_BATTLE_TYPE = 'other'

# Client images, RU 1.45 gui-part1/2.pkg.
MAP_STATS_ICON = 'gui/maps/icons/map/stats/%s.png'
MAP_SMALL_ICON = 'gui/maps/icons/map/small/%s.png'
VEHICLE_ICON = 'gui/maps/icons/vehicle/%s.png'
MASTERY_ICON = 'gui/maps/icons/library/proficiency/class_icons_%d_small.png'
MAX_MASTERY = 4
VEHICLE_NAME = re.compile(r'^[a-z]+-[A-Za-z0-9_\-]+\Z')
MAP_NAME = re.compile(r'^[A-Za-z0-9_]+\Z')

STAT_KEYS = (
    'assist',
    'kills',
    'xp',
    'base_xp',
    'credits',
    'spotted',
    'marks',
    'shots',
    'hits',
    'pens',
    'received',
    'blocked',
    'duration',
    'life_time',
)

ANALYSIS_PATH = '/mod/me/replays'
ANALYSIS_POLL_S = 60
ANALYSIS_WATCH_S = 6 * 3600
ANALYSIS_IDS_PER_READ = 20
PARSED = 'parsed'
ANALYSIS_FINAL = (PARSED, 'failed')
NOT_SERVED_STATUS = 404

# RU 1.45 client source :458: BattleReplay.autoStartBattleReplay plays only from a fresh start.
LAUNCH_FILE = 'replay_manager_play.json'
LAUNCH_TTL_S = 180
# RU 1.45 client source :403: BattleReplay.stop(self, rewindToTime=None, delete=False, isDestroyed=False).
STOP_DESTROYED_ARG = 'isDestroyed'
STOP_DESTROYED_INDEX = 2
