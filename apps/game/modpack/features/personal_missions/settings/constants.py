from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import CARD_FIXED

SWITCH = 'hangar_personal_missions'
SECTION = 'personal_missions'
GROUP = 'hangar'

DEFAULTS = {
    'show_hangar': True,
    'show_conditions': True,
    'max_missions': 3,
}
LIMITS = {'max_missions': (1, 6)}
FIXED = CARD_FIXED
