from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: feedback_adaptor.updateMarkerHitState FEEDBACK_EVENT_ID names.
MARKER_OUTCOMES = (
    ('VEHICLE_HIT', 'no_pen'),
    ('VEHICLE_RICOCHET', 'ricochet'),
    ('VEHICLE_ARMOR_PIERCED', 'pen'),
    ('VEHICLE_CRITICAL_HIT', 'crit'),
    ('VEHICLE_CRITICAL_HIT_DAMAGE', 'crit'),
    ('VEHICLE_CRITICAL_HIT_CHASSIS', 'tracks'),
    ('VEHICLE_CRITICAL_HIT_CHASSIS_PIERCED', 'crit'),
    ('VEHICLE_ARMOR_SCREEN_BLOCKED', 'spaced'),
    ('VEHICLE_TRACK_BLOCKED', 'tracks'),
    ('VEHICLE_WHEEL_BLOCKED', 'tracks'),
    ('VEHICLE_ARMOR_MISSED', 'missed_armor'),
)
PEN_OUTCOMES = ('pen', 'crit')

# BattleFeedbackCommon.BATTLE_EVENT_TYPE name -> tally key (RU 1.45 client source).
EVENT_KEYS = (
    ('DAMAGE', 'dealt'),
    ('TANKING', 'blocked'),
    ('RADIO_ASSIST', 'assist'),
    ('TRACK_ASSIST', 'assist'),
    ('STUN_ASSIST', 'stun'),
    ('RECEIVED_DAMAGE', 'received'),
    ('CRIT', 'crits'),
    ('RECEIVED_CRIT', 'received_crits'),
    ('KILL', 'kills'),
    ('SPOTTED', 'spotted'),
)
# Summed from the damage extra's getDamage() (feedback_events._DamageExtra).
DAMAGE_KEYS = ('dealt', 'blocked', 'assist', 'stun', 'received')
# Summed from the crits extra's getCritsCount() (feedback_events._CritsExtra).
CRIT_KEYS = ('crits', 'received_crits')
ENEMY_ONLY_KEYS = ('dealt', 'assist', 'stun', 'crits', 'kills', 'spotted')

# RU 1.45 client source: gui.battle_control.battle_constants.PERSONAL_EFFICIENCY_TYPE names.
EFFICIENCY_KEYS = (
    ('DAMAGE', 'dealt'),
    ('ASSIST_DAMAGE', 'assist'),
    ('BLOCKED_DAMAGE', 'blocked'),
    ('STUN', 'stun'),
    ('RECEIVED_DAMAGE', 'received'),
)

SUMMARY_LINE = (
    'battle: hits %(hits)d, pens %(pens)d, dealt %(dealt)d, blocked %(blocked)d, assist %(assist)d, stun %(stun)d, '
    'received %(received)d'
)
DETAIL_LINE = (
    'battle detail: markers [%s]; events %d batches, damaging hits %d, crits %d, kills %d; vanilla totals [%s]; '
    'hooks [%s]'
)
