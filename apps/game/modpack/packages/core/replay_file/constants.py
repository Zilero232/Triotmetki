from __future__ import absolute_import, division, print_function, unicode_literals

import re

MAGIC = 0x11343212
MAX_BLOCKS = 16
# Byte caps of the header blocks by index (the last one covers any later block): the arena block, then the battle
# results. 169 RU 1.45 replays peak at 47 KB and 163 KB (15 vs 15); 1 and 4 MiB leave room for 30 vs 30 modes.
MAX_HEADER_BLOCK_BYTES = (1024 * 1024, 4 * 1024 * 1024)
EXTENSIONS = ('.mtreplay', '.wotreplay')
# The recording in progress (BattleReplay.record, RU 1.45 :339-342): temp.mtreplay, or temp1..temp99 when that one is
# taken.
RECORDING_NAME = re.compile(r'^temp\d{0,2}\.(mt|wot)replay$')
HEAD_FORMAT = str('<II')
SIZE_FORMAT = str('<I')
DATE_TIME = re.compile(r'^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*$')
AVATAR_KEY = 'avatar'
RESULT_WIN = 'win'
RESULT_LOSS = 'loss'
RESULT_DRAW = 'draw'
# personal[<vehicle>].deathReason of a vehicle that lived to the end of the battle.
ALIVE_DEATH_REASON = -1

# The recorder's own entry of the results block (personal[<vehicle>], RU 1.45 battle results) -> our stat names.
# Nothing is read from the vehicles, players or avatars blocks (fair play).
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
