"""Hooks on the hit effects the client draws on the player's own vehicle.

Fair play: the calls on every other vehicle are passed through untouched and never reach a callback, so a feature
sees only the shots and splashes that land on the player's own tank, as the client draws them. The one exception,
`on_shot_with_own_vehicle`, also passes the player's own shots on another vehicle (the ones the client marks on that
vehicle's marker for the player, RU 1.45 Vehicle.showDamageFromShot `isAttacker`); a shot between two other vehicles
never reaches it."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ....hooks import override
from ....log import log_exception
from ...game import client_attr
from .constants import (
    BIGWORLD_MODULE,
    OWN_VEHICLE_ATTR,
    OWN_VEHICLE_ID_ATTR,
    PLAYER_FUNCTION,
    SHOT_METHOD,
    VEHICLE_CLASS,
    VEHICLE_MODULE,
)

__all__ = ('SHOT_METHOD', 'on_own_shot', 'on_own_vehicle_effect', 'on_shot_with_own_vehicle')


def _hook_vehicle(method, hook):
    vehicle = client_attr(VEHICLE_MODULE, VEHICLE_CLASS)
    if vehicle is None or not hasattr(vehicle, method):
        return False
    try:
        override(vehicle, method)(hook)
    except Exception:
        log_exception('own vehicle: %s' % method)
        return False
    return True


def on_own_vehicle_effect(method, callback):
    """After the client runs `Vehicle.<method>(attacker_id, *args)` on the player's own vehicle, calls
    `callback(attacker_id, *args)`. Returns False when nothing was hooked (no such client method, or the hook
    failed)."""
    def hook(original, entity, attacker_id, *args, **kwargs):
        result = original(entity, attacker_id, *args, **kwargs)
        if getattr(entity, OWN_VEHICLE_ATTR, False):
            callback(attacker_id, *args)
        return result

    return _hook_vehicle(method, hook)


def _own_vehicle_id():
    find = client_attr(BIGWORLD_MODULE, PLAYER_FUNCTION)
    return getattr(find() if find is not None else None, OWN_VEHICLE_ID_ATTR, None)


def is_shot_with_own_vehicle(entity, attacker_id, own_id):
    """True for a shot on the own vehicle by another vehicle, or on another vehicle by the own one (`own_id`)."""
    if getattr(entity, OWN_VEHICLE_ATTR, False):
        return attacker_id != getattr(entity, 'id', None)
    return own_id is not None and attacker_id == own_id


def on_shot_with_own_vehicle(callback):
    """`callback(vehicle, attacker_id, points, effects_index)` after the client drew a shot between the player's own
    vehicle and one other vehicle (`vehicle` is the entity it was drawn on). Returns False when nothing was hooked."""
    def hook(original, entity, attacker_id, points, effects_index, *args, **kwargs):
        result = original(entity, attacker_id, points, effects_index, *args, **kwargs)
        if is_shot_with_own_vehicle(entity, attacker_id, _own_vehicle_id()):
            callback(entity, attacker_id, points, effects_index)
        return result

    return _hook_vehicle(SHOT_METHOD, hook)


def on_own_shot(callback):
    """`callback(attacker_id, points)` for every shot the client draws on the player's own vehicle; `points` are the
    shot's packed segments (`core.shot_points.drawn_points` decodes them). Returns False when nothing was hooked."""
    def shot(attacker_id, points, *details):
        callback(attacker_id, points)

    return on_own_vehicle_effect(SHOT_METHOD, shot)
