# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import DEFAULT_ON, TEXT_SUFFIX, TRIGGERS

SWITCH = 'battle_auto_messages'
SECTION = 'auto_messages'
GROUP = 'battle'

CHANNELS = ('team', 'squad')
SPOTTED_EXTRAS = ('', 'help', 'attention')

DEFAULTS = {
    'channel': 'team',
    'min_interval_s': 10,
    'spotted_allies': 5,
    'spotted_extra': '',
    'low_hp_percent': 25,
    'damage_milestone_value': 2000,
    'reload_min_s': 15,
}
DEFAULTS.update((trigger, trigger in DEFAULT_ON) for trigger in TRIGGERS)
DEFAULTS.update((trigger + TEXT_SUFFIX, '') for trigger in TRIGGERS)

CHOICES = {'channel': CHANNELS, 'spotted_extra': SPOTTED_EXTRAS}

LIMITS = {
    'min_interval_s': (3, 60),
    'spotted_allies': (1, 15),
    'low_hp_percent': (10, 60),
    'damage_milestone_value': (500, 10000),
    'reload_min_s': (5, 60),
}

ADVANCED = ('min_interval_s',)
