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

# The folder is listed again at most this often while the window reads the page; headers are read in slices of the
# main thread's time so a first look at a large folder never stalls the hangar.
SCAN_EVERY_S = 3.0
INDEX_BUDGET_S = 0.04
INDEX_WANTED_S = 5.0

ACTION_REFRESH = 'refresh'
ACTION_FOLDER = 'open_folder'
ACTION_RENAME = 'rename'
ACTION_DELETE = 'delete'
ACTION_FAVOURITE = 'favourite'
ACTION_PLAY = 'play'
ACTION_UPLOAD = 'upload'
# Opens the hit viewer at the replay's battle (core.events hit_viewer_open).
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

# BattleReplay (RU 1.45 client source, :235 and :1030) hands the engine BigWorld.getProductVersion(); a replay whose
# clientVersionFromExe differs pops the client's own 'version differs' dialog, and its 'no' calls stop() on a replay
# that never started, which has no way back to the hangar. The mod starts only replays of the exact running version.
VERSION_PARTS = 4
VERSION_SPLIT = re.compile(r'[^0-9]+')

# The client may still be writing a replay: wait before naming it, give up on a battle without one.
AUTO_NAME_SETTLE_S = 10
AUTO_NAME_GIVE_UP_S = 30 * 60
AUTO_NAME_MATCH_S = 5 * 60
AUTO_NAME_CHECK_S = 15
# The library reads headers in the background only while the window shows the list; a battle waiting for its name reads
# the newest unread headers itself, this long per check (at least one file: the replay just written comes first).
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

# Client images by path (RU 1.45 gui-part1/2.pkg): the map's post-battle picture (500x235) with the list's small one
# (100x60) behind it, the hangar vehicle icon (160x100) and the mastery badges of the results screen.
MAP_STATS_ICON = 'gui/maps/icons/map/stats/%s.png'
MAP_SMALL_ICON = 'gui/maps/icons/map/small/%s.png'
VEHICLE_ICON = 'gui/maps/icons/vehicle/%s.png'
MASTERY_ICON = 'gui/maps/icons/library/proficiency/class_icons_%d_small.png'
MAX_MASTERY = 4
VEHICLE_NAME = re.compile(r'^[a-z]+-[A-Za-z0-9_\-]+$')
MAP_NAME = re.compile(r'^[A-Za-z0-9_]+$')

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

# contract/replay-analysis.schema.json: the site's analysis of an uploaded replay.
ANALYSIS_PATH = '/mod/me/replays'
ANALYSIS_POLL_S = 60
ANALYSIS_WATCH_S = 6 * 3600
ANALYSIS_IDS_PER_READ = 20
PARSED = 'parsed'
ANALYSIS_FINAL = (PARSED, 'failed')
# A server without the endpoint answers 404: stop asking for this game session.
NOT_SERVED_STATUS = 404

# 'Watch': the client plays a replay only from a fresh start (BattleReplay.autoStartBattleReplay, RU 1.45 client source
# :458), so the hangar writes the request and restarts the client; the next start plays it once. A request older than
# this is dropped, so a crash or a manual restart never plays a replay the player no longer asked for.
LAUNCH_FILE = 'replay_manager_play.json'
LAUNCH_TTL_S = 180
# BattleReplay.stop(self, rewindToTime=None, delete=False, isDestroyed=False) (RU 1.45 client source :403): game.fini
# and BattleReplay.destroy stop a playing replay with isDestroyed=True while the client is closing; that stop still
# calls BigWorld.quit(), which must stay a quit (turned into a restart it would relaunch a client the player just
# closed).
STOP_DESTROYED_ARG = 'isDestroyed'
STOP_DESTROYED_INDEX = 2
