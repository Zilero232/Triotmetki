from __future__ import absolute_import, division, print_function, unicode_literals

import time

from BattleFeedbackCommon import BATTLE_EVENT_TYPE

from ....core.classes import class_key
from ....core.client.battle import (
    SHOT_METHOD,
    BattleHooks,
    arena,
    call,
    feedback,
    on_shot_with_own_vehicle,
    vehicle_class,
    vehicle_info,
    vehicle_name,
)
from ....core.client.game import values_by_name
from ....core.log import log, safe
from ....core.own_result import own_result
from ..model import BOOK_FILE, MODULE_KEYS, OWN_TARGET, SIDE_DEALT, SIDE_RECEIVED, HitBook, gun_shell
from .constants import SIDE_BY_EVENT


# RU 1.45 avatar arena.vehicles[id]['vehicleType']: the descriptor the player panels read the tank from.
def gun_shots(vehicle_id):
    vehicles = getattr(arena(), 'vehicles', None) or {}
    descriptor = (vehicles.get(vehicle_id) or {}).get('vehicleType')
    shots = getattr(getattr(descriptor, 'gun', None), 'shots', None) or ()
    return [(shot.shell.effectsIndex, shot.shell.kind, shot.shell.caliber) for shot in shots]


def shot_shell(shooter_id, effects_index):
    return gun_shell(gun_shots(shooter_id), effects_index) or (None, None)


def aim_of(entity):
    getter = getattr(entity, 'getAimParams', None)
    return list(getter()) if getter is not None else None


# Only what shapes the model the hits are drawn on: the type and its chassis, turret and gun, never the equipment the
# packed descriptor (makeCompactDescr) would also carry.
def target_info(entity):
    descriptor = getattr(entity, 'typeDescriptor', None)
    vehicle_type = getattr(descriptor, 'type', None)
    info = {
        'cd': getattr(vehicle_type, 'compactDescr', None),
        'name': vehicle_name(entity.id),
        'class': class_key(vehicle_class(entity.id)),
    }
    for key in MODULE_KEYS:
        info[key] = getattr(getattr(descriptor, key, None), 'compactDescr', None)
    return info


def _map_label():
    arena_type = getattr(arena(), 'arenaType', None)
    return getattr(arena_type, 'name', None) or getattr(arena_type, 'geometryName', None)


def _arena_details(own_id):
    vehicle_type = getattr(vehicle_info(own_id), 'vehicleType', None)
    return {
        'geometry': getattr(getattr(arena(), 'arenaType', None), 'geometryName', None),
        'tier': getattr(vehicle_type, 'level', None),
    }


# Fair play: only the shots between the player's own tank and one other vehicle, as the client draws them
# (core.client.battle.on_shot_with_own_vehicle): the hits on the own tank and the player's own hits, with the shooter's
# shell and the hit vehicle's turret and gun pose as the client drew them (poliroid BattleHits records the same:
# BattleProcessor.processShot). Splashes (showDamageFromExplosion: artillery, air strikes) and the shots between two
# other vehicles are never recorded. Nothing is analysed or shown in battle: the angle and the armour are measured on
# the model in the hangar after it.
class HitRecorder(object):

    def __init__(self, component):
        self.component = component
        self.book = None
        self.account_id = None
        self.sides = values_by_name(BATTLE_EVENT_TYPE, SIDE_BY_EVENT)
        self.hooks = BattleHooks()
        bus = component.app.bus
        bus.on('battle_ready', self._on_battle_ready)
        bus.on('battle_leave', self._on_battle_leave)
        bus.on('battle_results', self._on_battle_results)
        component.follow_account(self._on_account)
        if not on_shot_with_own_vehicle(self.on_shot):
            log('hit viewer: Vehicle.%s not hooked, no hits are recorded' % SHOT_METHOD)

    def _keep(self):
        return self.component.settings.get('keep_battles')

    def _on_account(self, account_id):
        if account_id == self.account_id and self.book is not None:
            return
        self.account_id = account_id
        self.book = HitBook(self.component.account_file(BOOK_FILE, account_id), self._keep())

    def battles(self):
        return self.book.battles if self.book is not None else []

    def resize(self):
        if self.book is not None:
            self.book.resize(self._keep())
            self.book.save()

    def clear(self):
        if self.book is not None:
            self.book.clear()
            self.book.save()

    def _on_battle_ready(self, player):
        if self.book is None or not self.component.enabled():
            return
        battle_id = getattr(player, 'arenaUniqueID', None) or int(time.time())
        own_id = getattr(player, 'playerVehicleID', None)
        self.book.start(battle_id, time.time(), _map_label(), vehicle_name(own_id), _arena_details(own_id))
        self.hooks.clear()
        self.hooks.add(feedback, 'onPlayerFeedbackReceived', self._on_feedback)

    def _on_battle_leave(self):
        self.hooks.clear()
        if self.book is not None and self.book.finish() is not None:
            self.book.save()

    def _on_battle_results(self, arena_id, results):
        if self.book is not None and self.book.resolved(arena_id, own_result(results)):
            self.book.save()
            self.component.screen.battles_changed()

    def _recording(self, side):
        return self.book is not None and self.book.current is not None and self.component.settings.get('record_' + side)

    @safe
    def on_shot(self, entity, attacker_id, points, effects_index):
        own = getattr(entity, 'isPlayerVehicle', False)
        side = SIDE_RECEIVED if own else SIDE_DEALT
        if not self._recording(side):
            return
        other = attacker_id if own else entity.id
        key = OWN_TARGET if own else u'%d' % entity.id
        if not self.book.target(key, target_info(entity)):
            return
        shell, caliber = shot_shell(attacker_id, effects_index)
        shot = {
            'side': side,
            'target': key,
            'other': other,
            'vehicle': vehicle_name(other),
            'class': vehicle_class(other),
            'segments': list(points or ()),
            'shell': shell,
            'caliber': caliber,
            'aim': aim_of(entity),
        }
        self.book.hit(shot, time.time())

    def _on_feedback(self, events):
        if self.book is None or self.book.current is None:
            return
        now = time.time()
        for event in events:
            side = self.sides.get(event.getBattleEventType())
            extra = event.getExtra()
            if side is not None and call(extra, 'isShot', True):
                self.book.damage(side, event.getTargetID(), call(extra, 'getDamage', 0), now)
