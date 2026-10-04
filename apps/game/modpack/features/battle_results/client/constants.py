from __future__ import absolute_import, division, print_function, unicode_literals

# The shots come from core.client.battle.on_own_shot (the player's own vehicle only). Drawing their points on the
# hangar's 3D model needs its collision boxes and could not be checked without the client, so the window shows a
# schematic instead.
# RU 1.45 common/BattleFeedbackCommon.BATTLE_EVENT_TYPE: the own feedback's received damage (the attacker is the
# target id).
KIND_BY_EVENT = (('RECEIVED_DAMAGE', 'received'),)

# RU 1.45 BattleFeedbackCommon.BATTLE_EVENT_TYPE: the own feedback events the battle card counts. Damage, assist and
# blocked carry their amount in the extra (feedback_events._DamageExtra.getDamage); spotted and kills count one each.
LIVE_KIND_BY_EVENT = (
    ('DAMAGE', 'damage'),
    ('RADIO_ASSIST', 'radio'),
    ('TRACK_ASSIST', 'track'),
    ('STUN_ASSIST', 'stun'),
    ('TANKING', 'blocked'),
    ('SPOTTED', 'spotted'),
    ('KILL', 'frags'),
)
# The target of TANKING is the attacker; every other kind counts only for an enemy target.
ANY_TARGET_KEYS = ('blocked',)
COUNTED_KEYS = ('spotted', 'frags')
# RU 1.45 gui.battle_control.battle_constants.PERSONAL_EFFICIENCY_TYPE: the totals of the stock damage log panel
# (personal_efficiency_ctrl.onTotalEfficiencyUpdated); ASSIST_DAMAGE is radio + track as one number.
EFFICIENCY_KINDS = (
    ('DAMAGE', 'damage'),
    ('ASSIST_DAMAGE', 'assist_total'),
    ('BLOCKED_DAMAGE', 'blocked'),
    ('STUN', 'stun'),
)
# RU 1.45 BattleSummaryFeedbackEvent getters -> the card's count each one raises.
SUMMARY_GETTERS = (
    ('getTotalDamage', 'damage'),
    ('getTotalAssistDamage', 'assist_total'),
    ('getTotalBlockedDamage', 'blocked'),
    ('getTotalStunDamage', 'stun'),
)
# RU 1.45 constants.ARENA_PERIOD: the battle ended; ClientArena.onPeriodChange(period, endTime, length, additionalInfo)
# carries (winnerTeam, finishReason) then (gui/battle_control/arena_info/listeners.py), team 0 for a draw.
AFTERBATTLE = 'AFTERBATTLE'
