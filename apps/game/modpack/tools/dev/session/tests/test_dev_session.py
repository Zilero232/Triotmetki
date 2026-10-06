from __future__ import absolute_import, division, print_function, unicode_literals

import os
import sys
import unittest

TOOLS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

from dev import session  # noqa: E402


class _Builder(object):

    def __init__(self, failing):
        self.failing = failing

    def build(self, keys):
        if self.failing in keys:
            raise SystemExit('syntax error in %s' % self.failing)
        return {key: '%s.mtmod' % key for key in keys}


class BuildEachTest(unittest.TestCase):

    def test_a_package_that_fails_to_build_keeps_the_others_built(self):
        built = {}

        session.build_each(_Builder('core'), ['core', 'ui'], built)

        self.assertEqual(built, {'ui': 'ui.mtmod'})

    def test_the_packages_that_failed_are_named(self):
        failed = session.build_each(_Builder('core'), ['core', 'ui'], {})

        self.assertEqual(failed, ['core'])

    def test_a_broken_assets_file_counts_as_a_failed_build(self):
        class Broken(object):
            def build(self, keys):
                raise ValueError('Expecting value: line 1 column 1')

        failed = session.build_each(Broken(), ['ui'], {})

        self.assertEqual(failed, ['ui'])


if __name__ == '__main__':
    unittest.main()
