from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.inject import message_of, valid_layout


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


if __name__ == '__main__':
    unittest.main()
