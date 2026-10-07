from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import KIND_ASSIST, KIND_DAMAGE

KIND_BY_EVENT = (
    ('DAMAGE', KIND_DAMAGE),
    ('RADIO_ASSIST', KIND_ASSIST),
    ('TRACK_ASSIST', KIND_ASSIST),
    ('STUN_ASSIST', KIND_ASSIST),
)

NOT_IN_PLATOON = 'not in a platoon (show_solo is off)'
