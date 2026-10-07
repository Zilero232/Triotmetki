from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.compat import is_int
from .constants import BATTLE_SNAPSHOTS


class BattleSnapshots(object):

    def __init__(self, limit=BATTLE_SNAPSHOTS):
        self.limit = limit
        self.order = []
        self.by_arena = {}

    def battle_started(self, arena_id, snapshot):
        if not arena_id or not isinstance(snapshot, dict) or not is_int(snapshot.get('damage_rating')):
            return
        key = str(arena_id)
        if key not in self.by_arena:
            self.order.append(key)
        self.by_arena[key] = dict(snapshot)
        while len(self.order) > self.limit:
            self.by_arena.pop(self.order.pop(0), None)

    def before(self, arena_id, tank_id):
        snapshot = self.by_arena.get(str(arena_id))
        if snapshot is None or snapshot.get('tank_id') != tank_id:
            return None
        return dict(snapshot)

    def finished(self, arena_id):
        key = str(arena_id)
        if key in self.by_arena:
            self.order.remove(key)
            del self.by_arena[key]
