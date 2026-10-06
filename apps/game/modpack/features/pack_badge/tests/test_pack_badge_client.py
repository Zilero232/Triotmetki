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


class Provider(object):

    def getVehicleInfo(self, vehicle_id):
        account_id = OWN_ACCOUNT if vehicle_id == OWN_VEHICLE else 0
        return Namespace(player=Namespace(accountDBID=account_id))


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
        self.module.arena_dp = Provider
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

    def test_the_own_account_comes_from_the_arena(self):
        assert self.module.own_arena_account_id(self.player) == OWN_ACCOUNT

    def test_an_unbound_install_marks_its_own_row(self):
        panel = self.panel({'enabled': True, 'show_pack_badge': True})

        panel._on_battle_ready(self.player)

        assert panel.badges.started == (42, OWN_ACCOUNT)

    def test_the_own_badge_switched_off_marks_nothing(self):
        panel = self.panel({'enabled': True, 'show_pack_badge': False})

        panel._on_battle_ready(self.player)

        assert panel.badges.started == (42, None)


if __name__ == '__main__':
    unittest.main()
