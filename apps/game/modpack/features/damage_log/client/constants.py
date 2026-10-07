from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import (
    KIND_BLOCKED,
    KIND_CRIT,
    KIND_DAMAGE,
    KIND_RADIO,
    KIND_RECEIVED,
    KIND_RECEIVED_CRIT,
    KIND_STUN,
    KIND_TRACK,
)

# RU 1.45 common/BattleFeedbackCommon.BATTLE_EVENT_TYPE; TANKING and RECEIVED_* name the attacker.
EVENT_KINDS = (
    ('DAMAGE', KIND_DAMAGE),
    ('RADIO_ASSIST', KIND_RADIO),
    ('TRACK_ASSIST', KIND_TRACK),
    ('STUN_ASSIST', KIND_STUN),
    ('TANKING', KIND_BLOCKED),
    ('RECEIVED_DAMAGE', KIND_RECEIVED),
    ('CRIT', KIND_CRIT),
    ('RECEIVED_CRIT', KIND_RECEIVED_CRIT),
)
DEALT_KINDS = (KIND_DAMAGE, KIND_RADIO, KIND_TRACK, KIND_STUN, KIND_CRIT)
CRIT_KINDS = (KIND_CRIT, KIND_RECEIVED_CRIT)
AMMO_RACK_DEVICE = 'ammoBay'
AMMO_RACK_STATES = ('critical', 'destroyed')
