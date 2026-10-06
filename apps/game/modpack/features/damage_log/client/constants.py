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

# RU 1.45 common/BattleFeedbackCommon.BATTLE_EVENT_TYPE name -> our kind. TANKING and the RECEIVED_* events carry the
# attacker as their target id, as the stock damage log shows it.
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
# Kinds whose target is the player's own target: they count only for an enemy (an ally hit is not the player's log).
DEALT_KINDS = (KIND_DAMAGE, KIND_RADIO, KIND_TRACK, KIND_STUN, KIND_CRIT)
CRIT_KINDS = (KIND_CRIT, KIND_RECEIVED_CRIT)
# The damage panel's own device state for the ammo rack (VEHICLE_VIEW_STATE.DEVICES: (name, state, actual state)).
AMMO_RACK_DEVICE = 'ammoBay'
AMMO_RACK_STATES = ('critical', 'destroyed')
