from __future__ import absolute_import, division, print_function, unicode_literals

import time
import unittest

import _support  # noqa: F401
from otmetki.core.codec import decode_json, parse_json_body
from otmetki.core.codec.constants import MAX_NUMBER_CHARS


class DecodeJsonTest(unittest.TestCase):

    def test_numbers_up_to_the_limit_are_read(self):
        digits = '9' * MAX_NUMBER_CHARS

        self.assertEqual(decode_json('[%s]' % digits), [int(digits)])

    def test_a_longer_integer_is_refused(self):
        with self.assertRaises(ValueError):
            decode_json('[%s]' % ('9' * (MAX_NUMBER_CHARS + 1)))

    def test_a_longer_float_is_refused(self):
        with self.assertRaises(ValueError):
            decode_json('[0.%s]' % ('1' * MAX_NUMBER_CHARS))

    def test_a_million_digits_are_refused_at_once(self):
        started = time.time()

        body = parse_json_body(b'{"a":' + b'9' * 1000000 + b'}')

        self.assertIsNone(body)
        self.assertLess(time.time() - started, 0.5)

    def test_a_float_keeps_its_value(self):
        self.assertEqual(decode_json('{"a":-1.25e-3}'), {'a': -0.00125})


if __name__ == '__main__':
    unittest.main()
