from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.client.game import client_attr, service
from .constants import SERVICE_MODULE, SERVICE_NAME


def cached_results(arena_id):
    name = getattr(BigWorld.player(), 'name', None)
    if not name or not arena_id:
        return None
    try:
        from account_helpers import BattleResultsCache
        compact = BattleResultsCache.load(name, arena_id)
        return BattleResultsCache.convertToFullForm(compact) if compact else None
    except Exception:
        return None


def results_service():
    return service(client_attr(SERVICE_MODULE, SERVICE_NAME))


def posted_arena_id(reusable_info):
    return getattr(reusable_info, 'arenaUniqueID', None)
