from __future__ import absolute_import, division, print_function, unicode_literals

import re

MAGIC = 0x11343212
MAX_BLOCKS = 16
# 169 RU 1.45 replays peak at 47 KB and 163 KB per block.
MAX_HEADER_BLOCK_BYTES = (1024 * 1024, 4 * 1024 * 1024)
EXTENSIONS = ('.mtreplay', '.wotreplay')
# RU 1.45 BattleReplay.record :339-342: temp.mtreplay, or temp1..temp99 when it is taken.
RECORDING_NAME = re.compile(r'^temp\d{0,2}\.(mt|wot)replay\Z')
HEAD_FORMAT = str('<II')
SIZE_FORMAT = str('<I')
# RU 1.45 replays folder: a recorded battle's name starts with its local start, 20260927_2209_czech-Cz17_...
NAME_STAMP = re.compile(r'^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})_')
DATE_TIME = re.compile(r'^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*\Z')
AVATAR_KEY = 'avatar'
RESULT_WIN = 'win'
RESULT_LOSS = 'loss'
RESULT_DRAW = 'draw'
DRAW_TEAM = 0
ALIVE_DEATH_REASON = -1

# Fair play: only the recorder's own personal entry; vehicles, players and avatars are never read.
OWN_STATS = (
    ('damageAssistedRadio', 'assist_radio'),
    ('damageAssistedTrack', 'assist_track'),
    ('damageAssistedStun', 'assist_stun'),
    ('kills', 'kills'),
    ('xp', 'xp'),
    ('originalXP', 'base_xp'),
    ('credits', 'credits'),
    ('spotted', 'spotted'),
    ('markOfMastery', 'mastery'),
    ('marksOnGun', 'marks'),
    ('shots', 'shots'),
    ('directEnemyHits', 'hits'),
    ('piercingEnemyHits', 'pens'),
    ('damageReceived', 'received'),
    ('damageBlockedByArmor', 'blocked'),
    ('lifeTime', 'life_time'),
    ('typeCompDescr', 'tank_id'),
)
# The results screen's assisted damage (gui/battle_results/components/personal.py:432): radio plus tracks.
ASSIST_KEYS = ('assist_radio', 'assist_track')
COMMON_STATS = (
    ('duration', 'duration'),
    ('bonusType', 'bonus_type'),
    ('finishReason', 'finish_reason'),
)
