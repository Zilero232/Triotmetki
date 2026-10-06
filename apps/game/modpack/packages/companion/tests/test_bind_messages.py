from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.companion.binding.constants import FAILURE_KEY, FAILURE_KEYS
from otmetki.companion.binding.messages import failure_key
from otmetki.companion.i18n import STRINGS


class FailureKeyTest(unittest.TestCase):

    def test_a_known_refusal_has_its_own_string(self):
        assert failure_key('rate_limited') == FAILURE_KEYS['rate_limited']

    def test_server_text_falls_back_to_the_generic_string(self):
        assert failure_key('<font color="#f00">pay here</font>') == FAILURE_KEY

    def test_a_missing_reason_falls_back_to_the_generic_string(self):
        assert failure_key(None) == FAILURE_KEY

    def test_a_reason_of_the_wrong_type_falls_back_to_the_generic_string(self):
        assert failure_key({'error': 'rate_limited'}) == FAILURE_KEY

    def test_every_failure_string_is_translated(self):
        keys = set(FAILURE_KEYS.values()) | {FAILURE_KEY}

        missing = [(language, key) for language in ('ru', 'en') for key in sorted(keys) if key not in STRINGS[language]]

        assert missing == []

    def test_no_failure_string_takes_an_argument(self):
        keys = set(FAILURE_KEYS.values()) | {FAILURE_KEY}

        formatted = [key for key in sorted(keys) if '{' in STRINGS['ru'][key] or '{' in STRINGS['en'][key]]

        assert formatted == []


if __name__ == '__main__':
    unittest.main()
