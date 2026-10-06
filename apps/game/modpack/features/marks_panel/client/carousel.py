from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import client_attr
from ....core.hooks import override
from ....core.log import log
from ..model.carousel import carousel_stats
from .constants import CAROUSEL_CLASS, CAROUSEL_MODULE, DOSSIER_BLOCK, DOSSIER_RATING, STATS_METHOD, STATS_TEXT


def _damage_rating(provider, vehicle):
    dossier = provider._itemsCache.items.getVehicleDossier(vehicle.intCD)
    return dossier.getRecordValue(DOSSIER_BLOCK, DOSSIER_RATING) if dossier is not None else None


class CarouselPercent(object):

    def __init__(self, is_on):
        self.is_on = is_on
        provider = client_attr(CAROUSEL_MODULE, CAROUSEL_CLASS)
        if provider is None or getattr(provider, STATS_METHOD, None) is None:
            log('marks: %s.%s not found, no percent on the carousel' % (CAROUSEL_CLASS, STATS_METHOD))
            return
        override(provider, STATS_METHOD)(self._stats)

    def _stats(self, original, provider, vehicle, *args, **kwargs):
        stats = original(provider, vehicle, *args, **kwargs)
        if not self.is_on() or not isinstance(stats, dict) or not stats.get(STATS_TEXT):
            return stats
        with_percent = dict(stats)
        with_percent[STATS_TEXT] = carousel_stats(stats[STATS_TEXT], _damage_rating(provider, vehicle))
        return with_percent
