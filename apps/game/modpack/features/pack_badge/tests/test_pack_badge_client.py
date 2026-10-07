from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.pack_badge.client')
OWN_VEHICLE = 7
OWN_ACCOUNT = 3500


class Namespace(object):

    def __init__(self, **values):
        self.__dict__.update(values)


def arena_account(player):
    return OWN_ACCOUNT if player.playerVehicleID == OWN_VEHICLE else None


class Badges(object):

    def __init__(self):
        self.started = None
        self.requested = True

    def start(self, arena_id, own_account_id):
        self.started = (arena_id, own_account_id)


def forget_client():
    _support.forget_modules(CLIENT_PREFIXES)


class OwnBadgeTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        forget_client()
        sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
        self.module = importlib.import_module('otmetki.features.pack_badge.client')
        self.module.own_account_id = arena_account
        self.player = Namespace(playerVehicleID=OWN_VEHICLE, arenaUniqueID=42)

    def tearDown(self):
        forget_client()
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    def panel(self, config):
        panel = self.module.PackBadge.__new__(self.module.PackBadge)
        panel.app = Namespace(config=config, is_bound=lambda: False, auth_failed=False)
        panel.enabled = lambda: True
        panel.badges = Badges()
        panel.hooks = Namespace(add=lambda *args: None)
        panel.refresh = lambda: None
        panel.request = lambda arena_id: None
        return panel

    def test_an_unbound_install_marks_its_own_row(self):
        panel = self.panel({'enabled': True, 'show_pack_badge': True})

        panel._on_battle_ready(self.player)

        assert panel.badges.started == (42, OWN_ACCOUNT)

    def test_the_own_badge_switched_off_marks_nothing(self):
        panel = self.panel({'enabled': True, 'show_pack_badge': False})

        panel._on_battle_ready(self.player)

        assert panel.badges.started == (42, None)


class VehicleInfo(object):

    def __init__(self, data):
        self.data = data

    def get(self):
        return self.data


def stock_add_vehicle_info(component):
    component.data.update({'accountDBID': OWN_ACCOUNT, 'region': None, 'hasSelectedBadge': True, 'badge': 'stock'})


class RowDecorationTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        forget_client()
        sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
        self.module = importlib.import_module('otmetki.features.pack_badge.client')
        self.component = VehicleInfo({})

    def tearDown(self):
        forget_client()
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    def panel(self, marked, is_enabled=True):
        panel = self.module.PackBadge.__new__(self.module.PackBadge)
        panel.enabled = lambda: is_enabled
        panel.badges = Namespace(marked=frozenset(marked))
        panel.drawn = False
        return panel

    def test_a_marked_row_carries_the_badge_after_the_name(self):
        self.panel([OWN_ACCOUNT])._add_vehicle_info(stock_add_vehicle_info, self.component)

        assert self.component.data['region'] == self.module.BADGE_TAG

    def test_a_marked_row_keeps_its_stock_badge(self):
        self.panel([OWN_ACCOUNT])._add_vehicle_info(stock_add_vehicle_info, self.component)

        assert self.component.data['badge'] == 'stock'

    def test_the_component_switched_off_leaves_the_row(self):
        self.panel([OWN_ACCOUNT], is_enabled=False)._add_vehicle_info(stock_add_vehicle_info, self.component)

        assert self.component.data['region'] is None


if __name__ == '__main__':
    unittest.main()
