from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.inject import below_covers, message_of, valid_layout


class ValidLayoutTest(unittest.TestCase):

    def test_keeps_a_layout_id(self):
        assert valid_layout(4100) == 4100

    def test_the_invalid_res_id_is_none(self):
        assert valid_layout(-1) is None

    def test_a_non_int_answer_is_none(self):
        assert valid_layout('4100') is None

    def test_a_bool_is_none(self):
        assert valid_layout(True) is None


class MessageOfTest(unittest.TestCase):

    def test_reads_a_dict(self):
        assert message_of({'message': '{"type":"ready"}'}) == '{"type":"ready"}'

    def test_reads_a_dict_like_proxy(self):
        class Proxy(object):
            def get(self, key):
                return 'from ' + key

        assert message_of(Proxy()) == 'from message'

    def test_anything_else_is_none(self):
        assert message_of(None) is None


class BelowCoversTest(unittest.TestCase):

    def test_goes_below_the_lowest_cover(self):
        assert below_covers([7, 3, 9]) == 3

    def test_skips_a_cover_the_page_lacks(self):
        assert below_covers([None, 5]) == 5

    def test_takes_an_index_the_bridge_handed_over_as_a_float(self):
        assert below_covers([4.0, 6]) == 4

    def test_a_bool_is_no_index(self):
        assert below_covers([True]) is None

    def test_none_without_any_cover(self):
        assert below_covers([None, None]) is None


if __name__ == '__main__':
    unittest.main()
