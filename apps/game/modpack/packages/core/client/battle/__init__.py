"""Battle-session glue shared by the HUD components: session reads, waiting subscriptions and the hooks on the hit
effects drawn on the player's own vehicle."""
from __future__ import absolute_import, division, print_function, unicode_literals

from .hooks import BattleHooks
from .own_vehicle import SHOT_METHOD, on_own_shot, on_own_vehicle_effect, on_shot_with_own_vehicle
from .session import (
    ammo,
    arena,
    arena_dp,
    call,
    controls_own_vehicle,
    crosshair,
    damage_source,
    dealt_damage,
    feedback,
    is_enemy,
    optional_devices,
    personal_efficiency,
    player,
    server_time,
    session_provider,
    shared,
    summary_assist,
    vehicle_class,
    vehicle_info,
    vehicle_name,
    vehicle_state,
)

__all__ = (
    'SHOT_METHOD',
    'BattleHooks',
    'ammo',
    'arena',
    'arena_dp',
    'call',
    'controls_own_vehicle',
    'crosshair',
    'damage_source',
    'dealt_damage',
    'feedback',
    'is_enemy',
    'on_own_shot',
    'on_own_vehicle_effect',
    'on_shot_with_own_vehicle',
    'optional_devices',
    'personal_efficiency',
    'player',
    'server_time',
    'session_provider',
    'shared',
    'summary_assist',
    'vehicle_class',
    'vehicle_info',
    'vehicle_name',
    'vehicle_state',
)
