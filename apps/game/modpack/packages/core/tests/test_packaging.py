from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.packaging import mixed_install

SINGLE_PACKAGE = 'otmetki.0.1.1.mtmod'
SPLIT_CORE = 'net.triotmetki.core_0.3.0.mtmod'
SPLIT_COMPANION = 'otmetki.companion_0.3.0.mtmod'
SPLIT_UI = 'net.triotmetki.ui_0.1.2.mtmod'
GAMEFACE = 'net.openwg.gameface_1.2.2.mtmod'
MODSLIST = 'me.poliroid.modslistapi_1.6.01.mtmod'


class MixedInstallTest(unittest.TestCase):

    def test_split_set_alone_is_fine(self):
        names = [SPLIT_CORE, SPLIT_COMPANION, SPLIT_UI, GAMEFACE]

        found = mixed_install(names)

        self.assertIsNone(found)

    def test_single_alone_is_fine(self):
        names = [SINGLE_PACKAGE, MODSLIST]

        found = mixed_install(names)

        self.assertIsNone(found)

    def test_both_formats_are_reported(self):
        names = [SINGLE_PACKAGE, SPLIT_CORE, SPLIT_COMPANION]

        found = mixed_install(names)

        self.assertEqual(
            found,
            (
                ['otmetki.0.1.1.mtmod'],
                ['net.triotmetki.core_0.3.0.mtmod', 'otmetki.companion_0.3.0.mtmod'],
            ),
        )


if __name__ == '__main__':
    unittest.main()
