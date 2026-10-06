from __future__ import absolute_import, division, print_function, unicode_literals

import itertools

from . import DamageLog, Hit
from .constants import PREVIEW_ASSIST, PREVIEW_RECEIVED, PREVIEW_SHOTS, PREVIEW_STEP_S
from .text import format_damage_log
from .widget import damage_log_widget


def _add_shot(log, moment, shot):
    target, vehicle, vehicle_class, max_hp, outcome, damage, shell, gold, crits, hp = shot
    log.shots.describe(target, vehicle_class, max_hp)
    log.shots.add_result(target, outcome, moment, vehicle)
    hit = Hit(vehicle_id=target, vehicle=vehicle, shell=shell, gold=gold, source='shot', at=moment)
    log.add('damage', damage, hit)
    log.shots.add_crits(target, crits, moment)
    log.shots.set_health(target, hp, moment)


def _add_received(log, moment, received):
    attacker, vehicle, vehicle_class, kind, amount, shell, gold, source = received
    hit = Hit(attacker, vehicle, vehicle_class, shell, gold, source, moment)
    log.add(kind, amount, hit)


def preview_log():
    log = DamageLog()
    moments = itertools.count(0.0, PREVIEW_STEP_S)
    for shot in PREVIEW_SHOTS:
        _add_shot(log, next(moments), shot)

    target, vehicle, vehicle_class, kind, amount = PREVIEW_ASSIST
    log.add(kind, amount, Hit(vehicle_id=target, vehicle=vehicle, vehicle_class=vehicle_class))

    moment = None
    for received in PREVIEW_RECEIVED:
        moment = next(moments)
        _add_received(log, moment, received)
    log.received.ammo_rack_hit(moment)
    return log


def preview_text(settings, translate):
    return format_damage_log(preview_log(), settings, translate)


def preview_widget(settings, translate):
    return damage_log_widget(preview_log(), settings, translate)
