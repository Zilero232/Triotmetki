from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.battle_tally import Counters
from .constants import COUNT_KEYS
from .wn8 import wn8_state


class BattleCounts(Counters):

    def __init__(self):
        Counters.__init__(self, COUNT_KEYS)


def progress_state(counts, main_gun=None, row=None, settled=False):
    return {
        'main_gun': main_gun,
        'counts': dict(counts),
        'wn8': wn8_state(counts, row),
        'settled': settled,
    }
