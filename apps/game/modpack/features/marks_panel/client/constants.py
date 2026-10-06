# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import KIND_DAMAGE, KIND_RADIO, KIND_STUN, KIND_TRACK

KIND_BY_EVENT = (
    ('DAMAGE', KIND_DAMAGE),
    ('RADIO_ASSIST', KIND_RADIO),
    ('TRACK_ASSIST', KIND_TRACK),
    ('STUN_ASSIST', KIND_STUN),
)
# The hangar reads the tank's marks from its dossier (companion marks `vehicle_moe`); a tank below the marks tier or
# without a moving average has none, and the battle panel then stays off.
NO_SNAPSHOT = 'no hangar marks snapshot of tank %s (below tier 5 or no damage average yet)'
# RU 1.45 gui/Scaleform/daapi/view/common/vehicle_carousel/carousel_data_provider.py: CarouselDataProvider
# ._getVehicleStats(vehicle) gives a tile's stats row ({'statsText', 'visibleStats'}) from the vehicle's own dossier;
# the row shows while the carousel filter's «show statistics» is on (every hangar carousel derives from this provider).
CAROUSEL_MODULE = 'gui.Scaleform.daapi.view.common.vehicle_carousel.carousel_data_provider'
CAROUSEL_CLASS = 'CarouselDataProvider'
STATS_METHOD = '_getVehicleStats'
STATS_TEXT = 'statsText'
DOSSIER_BLOCK = 'achievements'
DOSSIER_RATING = 'damageRating'
