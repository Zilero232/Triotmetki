# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import DEFAULT_ON, TEXT_SUFFIX, TRIGGERS

SWITCH = 'battle_auto_messages'
SECTION = 'auto_messages'
GROUP = 'battle'

CHANNELS = ('team', 'squad')
# kurzdor «AutoBattleMessages» spotted extra: none, «Нужна помощь!» (the stock HELPME command), «Внимание на точку» (the
# stock ATTENTION_TO_POSITION ping on the player's own tank).
SPOTTED_EXTRAS = ('', 'help', 'attention')

# An empty text means the built-in variants in the client's language (i18n auto_messages_default_<trigger>).
DEFAULTS = {
    'channel': 'team',
    'min_interval_s': 10,
    # kurzdor: the spotted line only while 5 or fewer allies are alive.
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
