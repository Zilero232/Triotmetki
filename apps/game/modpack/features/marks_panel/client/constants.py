# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import KIND_DAMAGE, KIND_RADIO, KIND_STUN, KIND_TRACK

KIND_BY_EVENT = (
    ('DAMAGE', KIND_DAMAGE),
    ('RADIO_ASSIST', KIND_RADIO),
    ('TRACK_ASSIST', KIND_TRACK),
    ('STUN_ASSIST', KIND_STUN),
)
NO_MARKS_BATTLE = 'battle type %s does not count marks on gun (no DOSSIER_MARKS_ON_GUN)'
NO_SNAPSHOT = 'no hangar marks snapshot of tank %s (below tier 5 or no damage average yet)'
# RU 1.45 vehicle_carousel/carousel_data_provider.py CarouselDataProvider._getVehicleStats.
CAROUSEL_MODULE = 'gui.Scaleform.daapi.view.common.vehicle_carousel.carousel_data_provider'
CAROUSEL_CLASS = 'CarouselDataProvider'
STATS_METHOD = '_getVehicleStats'
STATS_TEXT = 'statsText'
DOSSIER_BLOCK = 'achievements'
DOSSIER_RATING = 'damageRating'
