"""Battle feedback payloads shaped as the RU 1.45 client builds them (IzeBerg/wot-src, branch RU):

- common/BattleFeedbackCommon.py: BATTLE_EVENT_TYPE, packDamage / unpackDamage, packCrits / unpackCrits
- client/gui/battle_control/controllers/feedback_events.py: _DamageExtra, _CritsExtra,
  PlayerFeedbackEvent.fromDict, BattleSummaryFeedbackEvent
- client/gui/battle_control/controllers/feedback_adaptor.py: VEHICLE_HEALTH payload
  (newHealth, attackerInfo, reasonID)
- client/gui/battle_control/battle_constants.py: FEEDBACK_EVENT_ID (range(1, 88)),
  PERSONAL_EFFICIENCY_TYPE
- common/constants.py: ATTACK_REASONS order, BATTLE_LOG_SHELL_TYPES (an IntEnum)

The server sends `{'eventType', 'targetID', 'count', 'details'}` dicts to Avatar.onBattleEvents;
the adaptor turns each into a PlayerFeedbackEvent whose extra is decoded from the packed `details`
int, as here.
"""
from __future__ import absolute_import, division, print_function

NONE_SHELL_TYPE = 127


class BATTLE_EVENT_TYPE(object):
    SPOTTED = 0
    RADIO_ASSIST = 1
    TRACK_ASSIST = 2
    BASE_CAPTURE_POINTS = 3
    BASE_CAPTURE_DROPPED = 4
    TANKING = 5
    CRIT = 6
    DAMAGE = 7
    KILL = 8
    RECEIVED_CRIT = 9
    RECEIVED_DAMAGE = 10
    STUN_ASSIST = 11
    SMOKE_ASSIST = 18
    INSPIRE_ASSIST = 19
    MULTI_STUN = 21


_FEEDBACK_NAMES = (
    'PLAYER_KILLED_ENEMY', 'PLAYER_DAMAGED_HP_ENEMY', 'PLAYER_DAMAGED_DEVICE_ENEMY', 'PLAYER_SPOTTED_ENEMY',
    'PLAYER_ASSIST_TO_KILL_ENEMY', 'PLAYER_ASSIST_TO_STUN_ENEMY', 'PLAYER_USED_ARMOR', 'PLAYER_CAPTURED_BASE',
    'PLAYER_DROPPED_CAPTURE', 'PLAYER_BLOCKED_CAPTURE', 'PLAYER_STUN_ENEMIES', 'VEHICLE_HEALTH', 'VEHICLE_HIT',
    'VEHICLE_CRITICAL_HIT', 'VEHICLE_CRITICAL_HIT_DAMAGE', 'VEHICLE_CRITICAL_HIT_CHASSIS',
    'VEHICLE_CRITICAL_HIT_CHASSIS_PIERCED', 'VEHICLE_RICOCHET', 'VEHICLE_ARMOR_PIERCED', 'VEHICLE_DEAD',
    'VEHICLE_SHOW_MARKER', 'VEHICLE_ATTRS_CHANGED', 'ENTITY_IN_FOCUS', 'VEHICLE_HAS_AMMO',
    'SHOW_VEHICLE_DAMAGES_DEVICES', 'HIDE_VEHICLE_DAMAGES_DEVICES', 'MINIMAP_SHOW_MARKER', 'MINIMAP_MARK_CELL',
    'DAMAGE_LOG_SUMMARY', 'POSTMORTEM_SUMMARY', 'ENEMY_DAMAGED_HP_PLAYER', 'ENEMY_DAMAGED_DEVICE_PLAYER',
)
_BLOCKED_FEEDBACK_IDS = {
    'VEHICLE_ARMOR_SCREEN_BLOCKED': 75,
    'VEHICLE_TRACK_BLOCKED': 76,
    'VEHICLE_WHEEL_BLOCKED': 77,
    'VEHICLE_ARMOR_MISSED': 78,
}
_FEEDBACK_IDS = {name: index + 1 for index, name in enumerate(_FEEDBACK_NAMES)}
_FEEDBACK_IDS.update(_BLOCKED_FEEDBACK_IDS)
FEEDBACK_EVENT_ID = type('FEEDBACK_EVENT_ID', (object,), _FEEDBACK_IDS)


class PERSONAL_EFFICIENCY_TYPE(object):
    DAMAGE = 1
    ASSIST_DAMAGE = 2
    BLOCKED_DAMAGE = 4
    RECEIVED_DAMAGE = 8
    RECEIVED_CRITICAL_HITS = 16
    STUN = 32


ATTACK_REASONS = ('shot', 'fire', 'ramming', 'world_collision', 'death_zone', 'drowning')
REASON = {name: index for index, name in enumerate(ATTACK_REASONS)}


SHELL_NAMES = (
    'HOLLOW_CHARGE', 'ARMOR_PIERCING', 'ARMOR_PIERCING_HE', 'ARMOR_PIERCING_CR', 'SMOKE', 'HE_MODERN',
    'HE_LEGACY_STUN', 'HE_LEGACY_NO_STUN', 'FLAME',
)
SHELL = {name: index for index, name in enumerate(SHELL_NAMES)}


class ShellType(int):
    """Stands in for a BATTLE_LOG_SHELL_TYPES IntEnum member (an int with a `name`) on Python 2 without enum."""

    @property
    def name(self):
        return SHELL_NAMES[self]


def pack_damage(damage, reason='shot', shell=NONE_SHELL_TYPE, gold=False):
    packed_damage = (int(damage) & 65535) << 25
    packed_reason = (REASON[reason] & 255) << 17
    packed_shell = (int(shell) & 127) << 9
    packed_gold = (1 if gold else 0) << 8
    return packed_damage | packed_reason | packed_shell | packed_gold


def pack_crits(count, reason='shot', shell=NONE_SHELL_TYPE):
    packed_count = (int(count) & 65535) << 24
    packed_reason = (REASON[reason] & 255) << 16
    packed_shell = (int(shell) & 127) << 9
    return packed_count | packed_reason | packed_shell


def _shell_type(shell_id):
    return None if shell_id == NONE_SHELL_TYPE else ShellType(shell_id)


class DamageExtra(object):

    def __init__(self, packed):
        self._damage = packed >> 25 & 65535
        self._reason = packed >> 17 & 255
        self._shell = _shell_type(packed >> 9 & 127)
        self._gold = bool(packed >> 8 & 1)

    def getDamage(self):
        return self._damage

    def getAttackReasonID(self):
        return self._reason

    def getShellType(self):
        return self._shell

    def isShellGold(self):
        return self._gold

    def isAttackReason(self, reason):
        return ATTACK_REASONS[self._reason] == reason

    def isShot(self):
        return self.isAttackReason('shot')

    def isFire(self):
        return self.isAttackReason('fire')

    def isRam(self):
        return self.isAttackReason('ramming')

    def isWorldCollision(self):
        return self.isAttackReason('world_collision')

    def isDeathZone(self):
        return self.isAttackReason('death_zone')


class CritsExtra(object):

    def __init__(self, packed):
        self._count = packed >> 24 & 65535
        self._reason = packed >> 16 & 255
        self._shell = _shell_type(packed >> 9 & 127)

    def getCritsCount(self):
        return self._count

    def getShellType(self):
        return self._shell

    def isShot(self):
        return ATTACK_REASONS[self._reason] == 'shot'


_DAMAGE_KINDS = (
    BATTLE_EVENT_TYPE.DAMAGE,
    BATTLE_EVENT_TYPE.RADIO_ASSIST,
    BATTLE_EVENT_TYPE.TRACK_ASSIST,
    BATTLE_EVENT_TYPE.STUN_ASSIST,
    BATTLE_EVENT_TYPE.TANKING,
    BATTLE_EVENT_TYPE.RECEIVED_DAMAGE,
    BATTLE_EVENT_TYPE.SMOKE_ASSIST,
    BATTLE_EVENT_TYPE.INSPIRE_ASSIST,
)
_CRIT_KINDS = (BATTLE_EVENT_TYPE.CRIT, BATTLE_EVENT_TYPE.RECEIVED_CRIT)


class PlayerFeedbackEvent(object):

    def __init__(self, data):
        self._kind = data['eventType']
        self._target = data['targetID']
        self._count = data['count']
        if self._kind in _DAMAGE_KINDS:
            self._extra = DamageExtra(data['details'])
        elif self._kind in _CRIT_KINDS:
            self._extra = CritsExtra(data['details'])
        else:
            self._extra = None

    def getBattleEventType(self):
        return self._kind

    def getTargetID(self):
        return self._target

    def getExtra(self):
        return self._extra

    def getCount(self):
        return self._count


def event(kind, target, details=0, count=1):
    return PlayerFeedbackEvent({'eventType': kind, 'targetID': target, 'count': count, 'details': details})


def damage(kind, target, amount, reason='shot', shell=NONE_SHELL_TYPE, gold=False):
    return event(kind, target, pack_damage(amount, reason, shell, gold))


def crits(kind, target, count, reason='shot'):
    return event(kind, target, pack_crits(count, reason))


class BattleSummaryFeedbackEvent(object):

    def __init__(self, damage=0, trackAssist=0, radioAssist=0, tankings=0, stunAssist=0):
        self._values = (damage, trackAssist + radioAssist, tankings, stunAssist)

    def getTotalDamage(self):
        return self._values[0]

    def getTotalAssistDamage(self):
        return self._values[1]

    def getTotalBlockedDamage(self):
        return self._values[2]

    def getTotalStunDamage(self):
        return self._values[3]
