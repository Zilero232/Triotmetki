from __future__ import absolute_import, division, print_function, unicode_literals

MAX_SHOTS = 200
MAX_DAMAGE = 10000
MAX_DISTANCE_M = 1500

UNKNOWN_SHELL = 'unknown'
KIND_BY_CODE = {
    'ap': 'armor_piercing',
    'apcr': 'armor_piercing_cr',
    'heat': 'hollow_charge',
    'he': 'high_explosive',
}
SHELL_KINDS = ('armor_piercing', 'armor_piercing_cr', 'hollow_charge', 'high_explosive')

OUTCOMES = ('damage', 'no_damage', 'miss')
