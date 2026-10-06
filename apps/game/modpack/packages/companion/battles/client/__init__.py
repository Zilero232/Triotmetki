from __future__ import absolute_import, division, print_function, unicode_literals

import time

import BattleReplay

from ....core.client.battle.tally import BattleTallyLog
from ....core.client.game import map_name, player_tank_id, vehicle_info
from ....core.log import log
from ...loadout import LoadoutTracker
from ...loadout.client import read_current_loadout
from ...marks.client.dossier import achievement_name, current_vehicle_id
from ...payload import PayloadError, build_battle_event, build_battle_start_event, build_queue_event
from ...queue_timer import QueueTimer
from ...shots.client import ShotTracker
from ..constants import PLAYED_ARENAS_LIMIT, RESULTS_POLL_ATTEMPTS, RESULTS_POLL_EVERY_S, SEEN_ARENAS_LIMIT
from .constants import POSTED_EVENT
from .results import cached_results, posted_arena_id, results_service


class BattleCapture(object):

    def __init__(self, app):
        self.app = app
        self.seen_arenas = list(app.state.get('seen_arenas') or [])
        app.register_state('seen_arenas', self._dump_seen_arenas)
        self.queue_timer = QueueTimer()
        self.queue_wait_by_arena = {}
        self.loadouts = LoadoutTracker()
        self.shot_tracker = ShotTracker()
        self.tally = BattleTallyLog()
        self.shots_by_arena = {}
        self.shot_arena = None
        self.pending_arenas = []
        self.played_arenas = []
        self.last_results_poll = 0.0
        self.results_service = None

    def _dump_seen_arenas(self):
        self.seen_arenas = self.seen_arenas[-SEEN_ARENAS_LIMIT:]
        return self.seen_arenas

    def on_enqueued(self, queue_type):
        self.queue_timer.enqueued(queue_type, time.time())
        if self.app.config.is_enabled('send_loadouts'):
            tank_id, loadout = read_current_loadout()
            self.loadouts.queued(tank_id, loadout)

    def on_dequeued(self):
        now = time.time()
        finished = self.queue_timer.dequeued(now)
        if finished is not None and self.app.config.is_enabled('send_queue_times'):
            self._enqueue_queue_time(finished, 'dequeued', now)

    def on_arena_created(self):
        app = self.app
        now = time.time()
        finished = self.queue_timer.arena_created(now)
        if finished is not None and app.config.is_enabled('send_queue_times'):
            self._enqueue_queue_time(finished, 'arena', now)
        if BattleReplay.isPlaying():
            return
        if app.enqueue(build_battle_start_event(now, current_vehicle_id())):
            app.flush_requested = True

    def _enqueue_queue_time(self, finished, outcome, now):
        queue_type, wait = finished
        self.app.enqueue(build_queue_event(queue_type, wait, outcome, now, current_vehicle_id()))

    def on_battle_ready(self, player):
        self.tally.start()
        arena_id = getattr(player, 'arenaUniqueID', None)
        wait = self.queue_timer.take_last_wait()
        if not arena_id:
            return

        self.app.bus.emit('battle_start', arena_id)
        tank_id = player_tank_id(player)
        self.loadouts.battle_started(arena_id, tank_id)
        self.app.marks.battle_started(arena_id, tank_id)
        if wait is not None:
            self.queue_wait_by_arena[arena_id] = wait
        self._track_arena(arena_id)
        if self.app.config.is_enabled('send_shots'):
            self.shot_arena = arena_id
            self.shot_tracker.start()

    def _track_arena(self, arena_id):
        if arena_id not in [pending[0] for pending in self.pending_arenas]:
            self.pending_arenas.append([arena_id, 0])
        if arena_id not in self.played_arenas:
            self.played_arenas = (self.played_arenas + [arena_id])[-PLAYED_ARENAS_LIMIT:]

    def on_battle_leave(self):
        self.tally.stop()
        shots = self.shot_tracker.take()
        if self.shot_arena is not None and shots:
            self.shots_by_arena[self.shot_arena] = shots
        self.shot_arena = None

    def on_battle_results(self, is_player_vehicle, results):
        if is_player_vehicle and not BattleReplay.isPlaying():
            self.handle_results(results)

    def on_hangar(self):
        if self.results_service is not None:
            return
        results = results_service()
        if results is not None and getattr(results, POSTED_EVENT, None) is not None:
            self.app.hooks.add(results, POSTED_EVENT, self.on_result_posted)
            self.results_service = results

    def on_result_posted(self, reusable_info, *args):
        arena_id = posted_arena_id(reusable_info)
        if arena_id in self.played_arenas and arena_id not in self.seen_arenas:
            self._take_cached(arena_id)

    def poll_pending_results(self, now):
        if not self.pending_arenas or now - self.last_results_poll < RESULTS_POLL_EVERY_S:
            return
        self.last_results_poll = now

        pending = self.pending_arenas.pop(0)
        pending[1] += 1
        arena_id, attempts = pending
        if attempts < RESULTS_POLL_ATTEMPTS:
            self.pending_arenas.append(pending)
        if not self._take_cached(arena_id) and attempts >= RESULTS_POLL_ATTEMPTS:
            self._forget(arena_id)

    def _take_cached(self, arena_id):
        results = cached_results(arena_id)
        if not isinstance(results, dict) or not results:
            return False
        self.handle_results(results)
        return True

    def _forget(self, arena_id):
        self.shots_by_arena.pop(arena_id, None)
        self.queue_wait_by_arena.pop(arena_id, None)
        self.loadouts.take(arena_id, None)

    def handle_results(self, results):
        arena_id = results.get('arenaUniqueID')
        self.pending_arenas = [pending for pending in self.pending_arenas if pending[0] != arena_id]
        if not arena_id or arena_id in self.seen_arenas or self._is_foreign(results):
            return

        self.app.bus.emit('battle_results', arena_id, results)
        event = self._battle_event(arena_id, results)
        if event is not None:
            self._record(arena_id, event)
            return
        # Results no event can be built from are still seen: the client posting them again must not count them twice.
        self.seen_arenas.append(arena_id)
        self.app.save_state()

    def _is_foreign(self, results):
        avatar = (results.get('personal') or {}).get('avatar') or {}
        owner = avatar.get('accountDBID')
        return bool(owner and self.app.account_id and owner != self.app.account_id)

    def _battle_event(self, arena_id, results):
        try:
            probe = build_battle_event(results)
        except PayloadError as error:
            log('skip battle results: %s' % error)
            return None

        tank_id = probe['vehicle']['tank_id']
        name, tier = vehicle_info(tank_id)
        common = results.get('common') or {}
        event = build_battle_event(results, {
            'vehicle_name': name,
            'vehicle_tier': tier,
            'map_name': map_name(common.get('arenaTypeID')),
            'queue_time_s': self.queue_wait_by_arena.pop(arena_id, None),
            'loadout': self._take_loadout(arena_id, tank_id),
            'shots': self._take_shots(arena_id),
            'achievement_name': achievement_name,
        })
        event['moe'] = self.app.marks.exact_moe(tank_id, event['moe'])
        return event

    def _take_loadout(self, arena_id, tank_id):
        if not self.app.config.is_enabled('send_loadouts'):
            return None
        return self.loadouts.take(arena_id, tank_id)

    def _take_shots(self, arena_id):
        if not self.app.config.is_enabled('send_shots'):
            return None
        return self.shots_by_arena.pop(arena_id, None)

    def _record(self, arena_id, event):
        app = self.app
        app.bus.emit('battle_event', event, time.time())
        self.seen_arenas.append(arena_id)
        app.marks.after_battle(event['vehicle']['tank_id'], event.get('moe'), arena_id)
        app.save_state()
        if app.config.is_enabled('send_battle_results') and app.enqueue(event):
            app.flush_requested = True
        app.bus.emit('battle_recorded')
