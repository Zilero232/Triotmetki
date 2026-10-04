from __future__ import absolute_import, division, print_function, unicode_literals

from .....core.battle_tally import Counters
from .....core.moe import combined_damage
from .constants import COUNT_KEYS


class LiveTotals(Counters):

    def __init__(self):
        Counters.__init__(self, COUNT_KEYS)

    def assist(self):
        values = self.values
        return max(values['radio'] + values['track'], values['assist_total'])

    def combined(self):
        values = self.values
        return combined_damage(values['damage'], values['radio'], values['track'], values['stun'])

    def stats(self):
        values = self.values
        return {
            'damage': values['damage'],
            'assist': self.assist(),
            'blocked': values['blocked'],
            'spotted': values['spotted'],
            'frags': values['frags'],
        }
