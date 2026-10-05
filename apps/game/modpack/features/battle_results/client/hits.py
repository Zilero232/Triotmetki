# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import time

from BattleFeedbackCommon import BATTLE_EVENT_TYPE

from ....core.client.battle import SHOT_METHOD, BattleHooks, call, feedback, on_own_shot, vehicle_class, vehicle_name
from ....core.client.game import values_by_name
from ....core.log import log, safe
from ..model.hits import BOOK_FILE, HitBook
from .constants import KIND_BY_EVENT


# Fair play: only the shots the client draws on the player's own tank (Vehicle.showDamageFromShot on the own vehicle)
# and the damage the own feedback reported.
class HitRecorder(object):

    def __init__(self, component):
        self.component = component
        self.book = None
        self.kinds = values_by_name(BATTLE_EVENT_TYPE, KIND_BY_EVENT)
        self.hooks = BattleHooks()
        bus = component.app.bus
        bus.on('battle_ready', self._on_battle_ready)
        bus.on('battle_leave', self._on_battle_leave)
        component.follow_account(self._on_account)
        if not on_own_shot(self.on_own_shot):
            log('battle results: Vehicle.%s not hooked, no hits are recorded' % SHOT_METHOD)

    def _keep(self):
        return self.component.settings.get('hits_keep_battles')

    def _on_account(self, account_id):
        self.book = HitBook(self.component.account_file(BOOK_FILE, account_id), self._keep())

    def battles(self):
        return self.book.battles if self.book is not None else []

    def clear(self):
        if self.book is not None:
            self.book.clear()
            self.book.save()

    def _is_recording(self):
        settings = self.component.settings
        return self.book is not None and self.component.enabled() and settings.get('hits_tab')

    def _on_battle_ready(self, player):
        if not self._is_recording():
            return
        battle_id = getattr(player, 'arenaUniqueID', None) or int(time.time())
        own_vehicle = vehicle_name(getattr(player, 'playerVehicleID', None))
        self.book.start(battle_id, own_vehicle, time.time())
        self.hooks.add(feedback, 'onPlayerFeedbackReceived', self._on_feedback)

    def _on_battle_leave(self):
        self.hooks.clear()
        if self.book is not None and self.book.finish() is not None:
            self.book.save()

    @safe
    def on_own_shot(self, attacker_id, points):
        if self.book is None or self.book.current is None:
            return
        self.book.hit(points, vehicle_name(attacker_id), vehicle_class(attacker_id), time.time())

    def _on_feedback(self, events):
        if self.book is None or self.book.current is None:
            return
        now = time.time()

        for event in events:
            if self.kinds.get(event.getBattleEventType()) != 'received':
                continue
            extra = event.getExtra()
            if call(extra, 'isShot', True):
                attacker = vehicle_name(event.getTargetID())
                self.book.damage(attacker, call(extra, 'getDamage', 0), now)
