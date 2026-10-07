"""Reads of the battle session that the player's own GUI already uses: the battle feedback, the state of
the controlled vehicle, the arena data provider behind the player panels. Nothing here reads
positions, aim, reloads or spotting."""
from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....battle_tally import assist_with_stun, own_damage
from ....compat import call
from .constants import SOURCE_CHECKS

try:
    from BattleFeedbackCommon import BATTLE_EVENT_TYPE
except ImportError:
    BATTLE_EVENT_TYPE = None


def player():
    return BigWorld.player()


def session_provider():
    return getattr(player(), 'guiSessionProvider', None)


def shared(name):
    return getattr(getattr(session_provider(), 'shared', None), name, None)


def feedback():
    return shared('feedback')


def vehicle_state():
    return shared('vehicleState')


def ammo():
    return shared('ammo')


def optional_devices():
    """The own vehicle's equipment controller (OptionalDevicesController, RU 1.45 client source)."""
    return shared('optionalDevices')


def crosshair():
    return shared('crosshair')


def personal_efficiency():
    """The controller behind the vanilla damage log totals (RU 1.45 client source:
    repositories.personalEfficiencyCtrl)."""
    return shared('personalEfficiencyCtrl')


def arena_dp():
    getter = getattr(session_provider(), 'getArenaDP', None)
    return getter() if getter is not None else None


def arena():
    return getattr(player(), 'arena', None)


def server_time():
    getter = getattr(BigWorld, 'serverTime', None)
    return getter() if getter is not None else None


def controls_own_vehicle():
    """True while the camera follows the player's own vehicle (not a teammate after death)."""
    state = vehicle_state()
    if state is None:
        return False
    return state.getControllingVehicleID() == getattr(player(), 'playerVehicleID', None)


def vehicle_info(vehicle_id):
    provider = arena_dp()
    if provider is None or not vehicle_id:
        return None
    return provider.getVehicleInfo(vehicle_id)


def own_account_id(avatar):
    """The player's own account id from the arena data (RU 1.45 Avatar.playerVehicleID), or None; it is there in a
    battle the client reconnected to straight after a crash, before any hangar."""
    info = vehicle_info(getattr(avatar, 'playerVehicleID', None))
    account_id = getattr(getattr(info, 'player', None), 'accountDBID', 0)
    return account_id or None


def vehicle_name(vehicle_id):
    """The short vehicle name the player panels and the vanilla damage log show."""
    vehicle_type = getattr(vehicle_info(vehicle_id), 'vehicleType', None)
    return getattr(vehicle_type, 'shortName', None) or getattr(vehicle_type, 'name', None)


def vehicle_class(vehicle_id):
    """The class tag (lightTank, mediumTank, heavyTank, AT-SPG, SPG) the player panels and the vanilla damage log
    show."""
    vehicle_type = getattr(vehicle_info(vehicle_id), 'vehicleType', None)
    return getattr(vehicle_type, 'classTag', None)


def is_enemy(vehicle_id):
    """True for a vehicle of an enemy team. RU 1.45 arena_dp.getVehicleInfo answers an unknown id with a blank
    VehicleArenaInfoVO of team 0, which isEnemyTeam would call an enemy, so a vehicle without a team is not one."""
    provider = arena_dp()
    team = getattr(vehicle_info(vehicle_id), 'team', None)
    if not team or provider is None:
        return False
    return bool(provider.isEnemyTeam(team))


# The damage one onPlayerFeedbackReceived batch reports the player dealt to enemies (that event carries only the
# player's own events: feedback_adaptor, RU 1.45).
def dealt_damage(events):
    return own_damage(events, getattr(BATTLE_EVENT_TYPE, 'DAMAGE', None), is_enemy)


def summary_assist(event):
    """The assist of an onPlayerSummaryFeedbackReceived summary, stun included."""
    return assist_with_stun(call(event, 'getTotalAssistDamage'), call(event, 'getTotalStunDamage'))


def damage_source(extra):
    """'shot', 'fire', 'ram', 'world' or 'other': what caused a damage the feedback reported."""
    for check, source in SOURCE_CHECKS:
        if call(extra, check, False):
            return source
    return 'other'
