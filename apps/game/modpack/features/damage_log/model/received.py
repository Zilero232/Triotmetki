from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int, to_text
from ....core.hud.icons import CLASS_GLYPHS
from ....core.shells import SHELL_CODES
from ....core.shot_points import drawn_points
from .constants import (
    AMMO_RACK_WINDOW_S,
    MAX_ENTRIES,
    OUTCOME_PEN,
    RECEIVED_MERGE_WINDOW_S,
    RICOCHET_CODES,
    SOURCES,
)
from .shots import positive_int

# Fair play: the hits on the player's own tank from the player's own feedback, as the stock damage log shows them. The
# attacker is the one the stock log names; nothing about positions or aim.


def _near(earlier, later, window):
    if earlier is None or later is None:
        return False

    return abs(later - earlier) <= window


# The shot's last drawn point is the one the client plays the hit effect for.
def is_ricochet(points):
    drawn = drawn_points(points)
    if not drawn:
        return False

    return drawn[-1].code in RICOCHET_CODES


class ReceivedLog(object):

    def __init__(self, sequence):
        self.sequence = sequence
        self.entries = []
        self.ammo_rack_at = None

    def _append(self, outcome, amount, hit):
        entry = {
            'seq': next(self.sequence),
            'outcome': outcome,
            'damage': amount,
            'attacker': hit.vehicle_id,
            'vehicle': to_text(hit.vehicle) if hit.vehicle else None,
            'class': hit.vehicle_class if hit.vehicle_class in CLASS_GLYPHS else None,
            'shell': hit.shell if hit.shell in SHELL_CODES else None,
            'gold': False,
            'source': hit.source if hit.source in SOURCES else None,
            'crits': 0,
            'ammo_rack': False,
            'pending': False,
            'at': hit.at,
        }
        entry['gold'] = bool(hit.gold) and entry['shell'] is not None
        self.entries.append(entry)
        del self.entries[:-MAX_ENTRIES]
        return entry

    def add_damage(self, amount, hit):
        damage = positive_int(amount)
        if damage is None:
            return False

        entry = self._append('pen', damage, hit)
        if _near(self.ammo_rack_at, entry['at'], AMMO_RACK_WINDOW_S):
            entry['ammo_rack'] = True
            self.ammo_rack_at = None
        return True

    # The drawn ricochet and the feedback's TANKING arrive in either order: TANKING fills a pending ricochet row of
    # the same attacker, or stands as a blocked row that a later ricochet turns.
    def add_blocked(self, amount, hit):
        damage = positive_int(amount)
        if damage is None:
            return False

        entry = self._recent(hit.vehicle_id, 'ricochet', hit.at, pending=True)
        if entry is None:
            self._append('blocked', damage, hit)
            return True

        entry['pending'] = False
        entry['damage'] = damage
        entry['shell'] = hit.shell if hit.shell in SHELL_CODES else None
        entry['gold'] = bool(hit.gold) and entry['shell'] is not None
        return True

    def ricochet(self, hit):
        if hit.vehicle_id is None:
            return False

        entry = self._recent(hit.vehicle_id, 'blocked', hit.at)
        if entry is not None:
            entry['outcome'] = 'ricochet'
            return True

        entry = self._append('ricochet', None, hit)
        entry['pending'] = True
        return True

    def _recent(self, attacker_id, outcome, at, pending=False):
        for entry in reversed(self.entries):
            if not _near(entry['at'], at, RECEIVED_MERGE_WINDOW_S):
                return None
            is_same_hit = entry['attacker'] == attacker_id and entry['outcome'] == outcome
            if is_same_hit and entry['pending'] == pending:
                return entry
        return None

    # A hit's crits join its damage row; crits without damage (a module or crew hit alone) are a row of their own.
    def add_crits(self, hit, count):
        crits = count if is_int(count) and count > 0 else 1
        entry = self._recent(hit.vehicle_id, 'pen', hit.at)
        if entry is None:
            entry = self._append('crit', None, hit)
            entry['source'] = None

        entry['crits'] += crits
        return True

    # The damage event may come before or after the ammo rack device state.
    def ammo_rack_hit(self, at):
        received = self._last_damage()
        if received is not None and _near(received['at'], at, AMMO_RACK_WINDOW_S) and not received['ammo_rack']:
            received['ammo_rack'] = True
            return True

        self.ammo_rack_at = at
        return False

    def _last_damage(self):
        for entry in reversed(self.entries):
            if entry['outcome'] == OUTCOME_PEN:
                return entry
        return None

    def rows(self):
        return [dict(entry, id='r%d' % entry['seq']) for entry in reversed(self.entries)]
