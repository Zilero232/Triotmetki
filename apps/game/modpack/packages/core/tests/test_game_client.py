# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import sys
import types
import unittest

import _support  # noqa: F401
from otmetki.core.client.game import type_compact_descr, vehicle_class_tag, vehicle_info, vehicle_short_name

STUBBED = ('items', 'items.vehicles')
REJECTED_DESCRIPTORS = (None, True, 0, -3, 1.0, 'T-34', '', b'\x01\x02')


class VehicleType(object):
    name = 'ussr:R04_T-34'
    level = 5
    shortUserString = u'Т-34'
    classTag = 'mediumTank'


def get_vehicle_type(compact_descr):
    if type(compact_descr) not in (int, type(10 ** 20)):
        raise TypeError('parsed as a packed descriptor')
    if compact_descr != 1:
        raise KeyError(compact_descr)
    return VehicleType()


class VehicleTypeTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        items = types.ModuleType(str('items'))
        items.__path__ = []
        vehicles = types.ModuleType(str('items.vehicles'))
        vehicles.getVehicleType = get_vehicle_type
        items.vehicles = vehicles
        sys.modules['items'] = items
        sys.modules['items.vehicles'] = vehicles

    def tearDown(self):
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def test_a_positive_int_reaches_the_client_as_is(self):
        assert type_compact_descr(1) == 1

    def test_a_digit_string_reaches_the_client_as_an_int(self):
        descriptor = type_compact_descr('1')

        assert descriptor == 1
        assert type(descriptor) is int

    def test_anything_but_a_positive_int_is_rejected(self):
        for bad in REJECTED_DESCRIPTORS:
            assert type_compact_descr(bad) is None, bad

    def test_short_name_of_a_type_id_given_as_a_digit_string(self):
        assert vehicle_short_name('1') == u'Т-34'

    def test_class_tag_of_a_type_id(self):
        assert vehicle_class_tag(1) == 'mediumTank'

    def test_info_of_a_type_id_is_its_name_and_level(self):
        assert vehicle_info(1) == ('ussr:R04_T-34', 5)

    def test_unknown_id_has_no_short_name(self):
        assert vehicle_short_name(2) is None

    def test_missing_id_has_no_class_tag(self):
        assert vehicle_class_tag(None) is None

    def test_invalid_id_has_no_info(self):
        assert vehicle_info('x') == (None, None)


if __name__ == '__main__':
    unittest.main()
