from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import client_attr, service
from ....core.log import guarded
from .constants import RESOURCE_KINDS

# RU 1.45 client source: IGoodiesCache.getBoosters(criteria) (gui/goodies/goodies_cache.py) with
# REQ_CRITERIA.BOOSTER.BOOSTER_CATEGORIES([BoosterCategory.PERSONAL]) (clan and event reserves left out); a Booster
# (gui/goodies/goodie_items.py) has boosterID, boosterType (GOODIE_RESOURCE_TYPE), effectValue, expiryTime (0: none),
# inCooldown (it is on) and isReadyToUse (in stock, off, a free slot of its category, no reserve of its type on).


def _kinds():
    resource_types = client_attr('goodies.goodie_constants', 'GOODIE_RESOURCE_TYPE')
    table = {}
    for name, kind in RESOURCE_KINDS:
        value = getattr(resource_types, name, None)
        if value is not None:
            table[value] = kind
    return table


def _personal_criteria():
    criteria = client_attr('gui.shared.utils.requesters', 'REQ_CRITERIA')
    category = client_attr('goodies.goodie_constants', 'BoosterCategory')
    if criteria is None or category is None:
        return None
    return criteria.BOOSTER.BOOSTER_CATEGORIES([category.PERSONAL])


def _summary(booster, kinds):
    return {
        'id': booster.boosterID,
        'kind': kinds.get(getattr(booster, 'boosterType', None)),
        'active': bool(getattr(booster, 'inCooldown', False)),
        'ready': bool(getattr(booster, 'isReadyToUse', False)),
        'value': getattr(booster, 'effectValue', 0),
        'expires': getattr(booster, 'expiryTime', 0),
    }


@guarded('auto reserves: read', fallback=([], {}))
def personal_reserves():
    cache = service(client_attr('skeletons.gui.goodies', 'IGoodiesCache'))
    criteria = _personal_criteria()
    if cache is None or criteria is None:
        return [], {}
    boosters = list(cache.getBoosters(criteria=criteria).values())
    kinds = _kinds()
    summaries = [_summary(booster, kinds) for booster in boosters]
    return summaries, {booster.boosterID: booster for booster in boosters}

