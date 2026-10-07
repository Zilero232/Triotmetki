from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.moe import exact_moe, is_post_battle_reading
from ...payload import build_moe_snapshot_event
from ..ledger import BattleSnapshots
from .dossier import current_vehicle_moe

# No RU 1.45 client code sends CMD_GET_VEHICLE_DAMAGE_DISTRIBUTION: thresholds come from public data.


class MarksCapture(object):

    def __init__(self, app):
        self.app = app
        self.hangar_moe = {}
        self.battles = BattleSnapshots()
        self.moe_sent = dict(app.state.get('moe_sent') or {})
        app.register_state('moe_sent', lambda: self.moe_sent)
        app.bus.on('account', self._on_account)

    def _on_account(self, account_id):
        self.hangar_moe = {}

    def on_vehicle_changed(self):
        snapshot = current_vehicle_moe()
        if snapshot is None:
            return
        tank_id = snapshot['tank_id']
        self.hangar_moe[tank_id] = snapshot
        self._send_snapshot(snapshot)
        self.app.bus.emit('vehicle_moe', snapshot)

    def battle_started(self, arena_id, tank_id):
        self.battles.battle_started(arena_id, self.hangar_moe.get(tank_id))

    def before_battle(self, arena_id, tank_id):
        return self.battles.before(arena_id, tank_id)

    def exact_moe(self, tank_id, moe):
        return exact_moe(moe, self.hangar_moe.get(tank_id))

    def after_battle(self, tank_id, moe, arena_id=None):
        self.battles.finished(arena_id)
        snapshot = self.hangar_moe.get(tank_id)
        if moe is not None and snapshot is not None and not is_post_battle_reading(moe, snapshot):
            snapshot.update({
                'damage_rating': moe['damage_rating'],
                'moving_avg_damage': moe['moving_avg_damage'],
                'marks_on_gun': moe['marks_on_gun'],
            })

    def _send_snapshot(self, snapshot):
        app = self.app
        if not app.config.is_enabled('send_moe_snapshots') or not snapshot.get('damage_rating'):
            return
        key = str(snapshot['tank_id'])
        signature = [snapshot['damage_rating'], snapshot['moving_avg_damage']]
        if self.moe_sent.get(key) == signature:
            return
        event = build_moe_snapshot_event(
            snapshot['tank_id'],
            snapshot['damage_rating'],
            snapshot['moving_avg_damage'],
            snapshot.get('marks_on_gun') or 0,
            snapshot.get('battles'),
            time.time(),
        )
        if app.enqueue(event):
            self.moe_sent[key] = signature
            app.save_state()
