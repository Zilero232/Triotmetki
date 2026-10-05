from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import client_attr, selected_vehicle, service
from ....core.compat import call, to_text
from ....core.log import log_exception

# RU 1.45 client source: IComp7Controller (gui/game_control/comp7_controller.py) keeps `isComp7PrbActive()` (the
# hangar is in Onslaught); the ranks config
# (ILobbyContext.getServerSettings().comp7RanksConfig.divisions, comp7_ranks_common.Comp7Division) holds the division
# ranges the rank tooltips show; gui/impl/lobby/comp7/comp7_shared.getPlayerDivision() is the division the Onslaught
# widget shows (the Legend one from the elite entitlement); getVehicleSkillEquipment(vehicle) is the role skill chosen
# for a vehicle (the skill select view, 1.45).


def _division(step):
    points = getattr(step, 'range', None)
    return {
        'rank': getattr(step, 'rank', None),
        'index': getattr(step, 'index', None),
        'begin': getattr(points, 'begin', None),
        'elite_percent': getattr(step, 'elitePercent', 0),
    }


def _controller():
    return service(client_attr('skeletons.gui.game_control', 'IComp7Controller'))


def _divisions():
    context = service(client_attr('skeletons.gui.lobby_context', 'ILobbyContext'))
    settings = call(context, 'getServerSettings')
    config = getattr(settings, 'comp7RanksConfig', None)
    return [_division(step) for step in getattr(config, 'divisions', None) or ()]


def _player_division():
    reader = client_attr('gui.impl.lobby.comp7.comp7_shared', 'getPlayerDivision')
    return _division(reader()) if reader is not None else None


def _skill(controller):
    vehicle = selected_vehicle()
    if vehicle is None:
        return None
    equipment = call(controller, 'getVehicleSkillEquipment', None, vehicle)
    name = getattr(equipment, 'userString', None)
    return to_text(name) if name else None


def comp7_state():
    try:
        controller = _controller()
        if controller is None or not call(controller, 'isComp7PrbActive', False):
            return None
        qualification = bool(call(controller, 'isQualificationActive', False))
        return {
            'division': None if qualification else _player_division(),
            'divisions': _divisions(),
            'qualification': qualification,
            'skill': _skill(controller),
        }
    except Exception:
        log_exception('comp7 helper: read')
        return None
