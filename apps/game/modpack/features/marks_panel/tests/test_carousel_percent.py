# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.format import format_percent, strip_tags
from otmetki.features.marks_panel.model.carousel import carousel_stats
from otmetki.features.marks_panel.settings import DEFAULTS


class CarouselPercentTest(unittest.TestCase):

    def test_the_percent_joins_the_stock_stats_row(self):
        text = strip_tags(carousel_stats(u'56%   2', 8612))

        self.assertEqual(text, u'56%   2   ' + format_percent(86.12))

    def test_a_tank_without_a_rating_keeps_the_stock_row(self):
        self.assertEqual(carousel_stats(u'56%', 0), u'56%')

    def test_the_carousel_percent_is_off_by_default(self):
        self.assertFalse(DEFAULTS['carousel_percent'])


if __name__ == '__main__':
    unittest.main()
