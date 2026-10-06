from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.client.game import client_attr, service
from ....core.compat import call, to_text
from ....core.log import guarded
from ..model.constants import CARAVAN_ENTITLEMENT, CLEAN_XP_OBJECTIVE

# RU 1.45 client source:
# - gui/event_boards (IEventBoardController, skeletons/gui/event_boards_controllers.py): the competitions the missions
#   page lists, loaded at login (gui/shared/personality.py: getEvents(onlySettings=True)); an EventSettings gives
#   getName, getObjectiveParameter ('originalXP' for a clean-XP one), getCardinality (the best battles counted),
#   isStarted, isFinished, getStartDateTs, getEndDateTs and getLimits().getVehiclesLevels(). UNVERIFIED on Lesta 1.45:
#   that Triathlon is listed there (its entry point is a hangar flag, as the event boards' HangarFlagData).
# - gui/game_control/shop_sales_event_controller.py (IShopSalesEventController): the Trading Caravan's hangar entry
#   point, isShopSalesEntryPointAvailable() while the event runs, activePhaseFinishTime / eventFinishTime; the token
#   count is the account entitlement the caravan page reads (web/web_client_api/trading_caravan:
#   itemsCache.items.stats.entitlements).


def _min_tier(event):
    levels = call(call(event, 'getLimits'), 'getVehiclesLevels') or ()
    levels = [level for level in levels if isinstance(level, int)]
    return min(levels) if levels else None


def _is_running_clean_xp(event):
    if call(event, 'getObjectiveParameter') != CLEAN_XP_OBJECTIVE:
        return False
    return call(event, 'isStarted', False) and not call(event, 'isFinished', True)


def _competition(event):
    name = call(event, 'getName')
    return {
        'name': to_text(name) if name else None,
        'cardinality': call(event, 'getCardinality'),
        'start': call(event, 'getStartDateTs'),
        'end': call(event, 'getEndDateTs'),
        'min_tier': _min_tier(event),
    }


@guarded('event trackers: competitions')
def triathlon_event():
    controller = service(client_attr('skeletons.gui.event_boards_controllers', 'IEventBoardController'))
    settings = call(controller, 'getEventsSettingsData')
    for event in call(settings, 'getEvents', ()) or ():
        if _is_running_clean_xp(event):
            return _competition(event)
    return None


def _caravan_finish(controller):
    active_until = getattr(controller, 'activePhaseFinishTime', 0) or 0
    if active_until > time.time():
        return active_until
    return getattr(controller, 'eventFinishTime', 0)


@guarded('event trackers: caravan')
def caravan():
    controller = service(client_attr('skeletons.gui.game_control', 'IShopSalesEventController'))
    if controller is None or not call(controller, 'isShopSalesEntryPointAvailable', False):
        return None
    items_cache = service(client_attr('skeletons.gui.shared', 'IItemsCache'))
    stats = getattr(getattr(items_cache, 'items', None), 'stats', None)
    entitlements = getattr(stats, 'entitlements', None) or {}

    return {'coins': entitlements.get(CARAVAN_ENTITLEMENT, 0), 'finish': _caravan_finish(controller)}

