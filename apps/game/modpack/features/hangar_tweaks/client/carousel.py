from __future__ import absolute_import, division, print_function, unicode_literals

import weakref

from ....core.client.game import client_attr
from ....core.client.native.settings_core import settings_core
from ....core.hooks import override
from ....core.log import log, log_exception
from ..model.constants import CAROUSEL_TYPE
from .constants import CAROUSEL_CLASS, CAROUSEL_MODULE, ROW_COUNT_METHOD


def stock_row_count():
    return settings_core().options.getSetting(CAROUSEL_TYPE).getRowCount()


class CarouselRows(object):

    def __init__(self, row_count):
        self.row_count = row_count
        self.carousels = weakref.WeakSet()
        carousel = client_attr(CAROUSEL_MODULE, CAROUSEL_CLASS)
        if carousel is None or getattr(carousel, ROW_COUNT_METHOD, None) is None:
            log('hangar tweaks: TankCarousel.%s not found, 3-5 carousel rows off' % ROW_COUNT_METHOD)
            return
        override(carousel, ROW_COUNT_METHOD)(self._as_row_count)

    def _as_row_count(self, original, carousel, value, *args, **kwargs):
        self.carousels.add(carousel)
        return original(carousel, self.row_count(value), *args, **kwargs)

    def resend(self):
        if not len(self.carousels):
            return
        try:
            stock = stock_row_count()
        except Exception:
            log_exception('hangar tweaks: carousel rows')
            return
        for carousel in list(self.carousels):
            carousel.as_rowCountS(stock)
