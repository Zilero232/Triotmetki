from __future__ import absolute_import, division, print_function, unicode_literals

import imp
import os
import unittest

import _support
from otmetki.core.vendor import VENDORED, attr, blinker, six
from otmetki.core.vendor.enum34 import Enum, IntEnum

VENDOR_SCRIPT = os.path.join(_support.MODPACK_DIR, 'tools', 'vendor', 'vendor.py')


def pins():
    return imp.load_source(str('otmetki_vendor_script'), VENDOR_SCRIPT).PINS


def licence_path(name):
    return os.path.join(_support.VENDOR_DIR, 'licenses', name + '.txt')


class VendorVersionTest(unittest.TestCase):

    def test_the_vendored_set_is_six_blinker_attrs_and_enum34(self):
        self.assertEqual(set(VENDORED), set(['six', 'blinker', 'attrs', 'enum34']))

    def test_six_reports_its_vendored_version(self):
        self.assertEqual(six.__version__, VENDORED['six'])

    def test_blinker_reports_its_vendored_version(self):
        self.assertEqual(blinker.__version__, VENDORED['blinker'])

    def test_attrs_reports_its_vendored_version(self):
        self.assertEqual(attr.__version__, VENDORED['attrs'])

    def test_versions_match_the_pins(self):
        pinned = {pin[0]: pin[1] for pin in pins()}

        self.assertEqual(pinned, VENDORED)


class VendorLicenceTest(unittest.TestCase):

    def test_every_library_ships_its_licence_file(self):
        for name in VENDORED:
            self.assertTrue(os.path.isfile(licence_path(name)), name)

    def test_every_licence_file_has_text(self):
        for name in VENDORED:
            self.assertGreater(os.path.getsize(licence_path(name)), 0, name)


class VendorImportTest(unittest.TestCase):

    def test_six_moves_resolve_under_the_game_package_name(self):
        self.assertTrue(six.moves.queue.Queue)
        self.assertTrue(six.moves.urllib.request.urlopen)

    def test_enum_looks_members_up_by_value(self):
        class Color(Enum):
            RED = 'red'

        self.assertIs(Color('red'), Color.RED)

    def test_int_enum_members_are_ints(self):
        shell = IntEnum('Shell', [('AP', 1)])

        self.assertEqual(shell.AP, 1)

    def test_attrs_classes_fill_defaults(self):
        @attr.s
        class Point(object):
            x = attr.ib()
            y = attr.ib(default=0)

        point = Point(1)

        self.assertEqual(attr.asdict(point), {'x': 1, 'y': 0})

    def test_blinker_signals_reach_their_receivers(self):
        signal = blinker.Namespace().signal('x')
        received = []
        signal.connect(received.append, weak=False)

        signal.send('sender')

        self.assertEqual(received, ['sender'])


if __name__ == '__main__':
    unittest.main()
