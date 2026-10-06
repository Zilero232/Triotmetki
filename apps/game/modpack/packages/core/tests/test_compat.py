# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.compat import clean_text, int_or_none, number_or_none


class NumberOrNoneTest(unittest.TestCase):

    def test_keeps_a_number_unchanged(self):
        assert number_or_none(5) == 5
        assert isinstance(number_or_none(5), int)

    def test_a_bool_or_text_is_not_a_number(self):
        assert number_or_none(True) is None
        assert number_or_none('5') is None

    def test_the_bounds_are_inclusive(self):
        assert number_or_none(0, 0) == 0
        assert number_or_none(10.0, 0, 10) == 10.0

    def test_outside_the_bounds_is_none(self):
        assert number_or_none(-0.5, 0) is None
        assert number_or_none(11, None, 10) is None


class IntOrNoneTest(unittest.TestCase):

    def test_keeps_an_int(self):
        assert int_or_none(-3) == -3

    def test_a_float_or_a_bool_is_not_an_int(self):
        assert int_or_none(3.0) is None
        assert int_or_none(False) is None

    def test_below_the_low_bound_is_none(self):
        assert int_or_none(0, 1) is None


class CleanTextTest(unittest.TestCase):

    def test_strips_and_cuts_to_the_limit(self):
        assert clean_text(b'  T-34-85  ', 4) == 'T-34'

    def test_blank_text_is_the_default(self):
        assert clean_text('   ', 10) is None
        assert clean_text('   ', 10, '') == ''

    def test_a_non_string_is_the_default(self):
        assert clean_text(42, 10) is None
        assert clean_text(None, 10, '') == ''


if __name__ == '__main__':
    unittest.main()
