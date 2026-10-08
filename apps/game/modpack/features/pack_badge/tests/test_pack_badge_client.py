from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.codec import parse_json_body

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.pack_badge.client')
LIBRARIES_MODULE = 'gui.Scaleform.required_libraries_config'
OWN_VEHICLE = 7
OWN_ACCOUNT = 3500
API = 'https://api.example'
ON = {'enabled': True, 'show_pack_badge': True}


class Namespace(object):

    def __init__(self, **values):
        self.__dict__.update(values)


def arena_account(player):
    return OWN_ACCOUNT if player.playerVehicleID == OWN_VEHICLE else None


class Bridge(object):

    def __init__(self):
        self.started = False
        self.shown = None

    def start(self):
        self.started = True

    def stop(self):
        self.started = False

    def show(self, vehicle_ids, names, other_names, reason):
        self.shown = (vehicle_ids, names, other_names, reason)


class Lookup(object):

    def __init__(self):
        self.running = False

    def start(self):
        self.running = True

    def stop(self):
        self.running = False


class ClientTestCase(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        _support.forget_modules(CLIENT_PREFIXES)
        sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
        self.module = importlib.import_module('otmetki.features.pack_badge.client')

    def tearDown(self):
        _support.forget_modules(CLIENT_PREFIXES)
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved


def arena_info(vehicle_id, account_id, is_bot=False):
    player = Namespace(accountDBID=account_id, name='Tanker%d' % account_id, fakeName='', isEventBot=is_bot)
    return Namespace(vehicleID=vehicle_id, player=player)


class Config(dict):

    def endpoint(self, path):
        return API + path


class BadgeComponentCase(ClientTestCase):

    def setUp(self):
        ClientTestCase.setUp(self)
        self.module.own_account_id = arena_account
        self.infos = [arena_info(OWN_VEHICLE, OWN_ACCOUNT), arena_info(8, 21), arena_info(9, 22, is_bot=True)]
        self.module.arena_infos = lambda: self.infos
        self.player = Namespace(playerVehicleID=OWN_VEHICLE, arenaUniqueID=42)
        self.transport = _support.FakeTransport()

    def component(self, config, is_enabled=True):
        component = self.module.PackBadge.__new__(self.module.PackBadge)
        component.app = Namespace(
            config=Config(config),
            transport=self.transport,
            user_agent=lambda: 'ua',
            is_bound=lambda: False,
            auth_failed=False,
            account_id=None,
            in_battle=False,
        )
        component.enabled = lambda: is_enabled
        component.badges = self.module.BattleBadges()
        component.hooks = Namespace(add=lambda *args: None, clear=lambda: None)
        component.bridge = Bridge()
        component.added_lookup = Lookup()
        component.own_switch = self.module.BadgeSwitch(component.shows_own())
        component.last_own_account_id = None
        component.page_found = False
        return component

    def battle_with_its_page(self, component):
        component._on_battle_ready(self.player)
        component._on_page_found()

    def sent(self):
        return [(request['url'], parse_json_body(request['body'])) for request in self.transport.requests]


class OwnBadgeTest(BadgeComponentCase):

    def test_an_unbound_install_marks_its_own_row(self):
        component = self.component(ON)

        component._on_battle_ready(self.player)

        assert component.badges.marked == frozenset([OWN_ACCOUNT])

    def test_nothing_is_asked_before_the_battle_page_is_found(self):
        component = self.component(ON)

        component._on_battle_ready(self.player)

        assert self.transport.requests == []

    def test_an_unbound_install_asks_who_has_the_mod_once_the_page_is_found(self):
        component = self.component(ON)

        self.battle_with_its_page(component)

        assert self.sent() == [(API + '/mod/badges/presence', {
            'account_id': OWN_ACCOUNT, 'visible': True, 'account_ids': [21],
        })]

    def test_the_page_found_again_asks_nothing_more(self):
        component = self.component(ON)
        self.battle_with_its_page(component)

        component._on_page_found()

        assert len(self.transport.requests) == 1

    def test_the_request_is_unsigned(self):
        component = self.component(ON)

        self.battle_with_its_page(component)

        headers = self.transport.requests[0]['headers']
        assert not [name for name in headers if name.lower().startswith('x-otmetki')]

    def test_the_own_badge_switched_off_marks_nothing(self):
        component = self.component(dict(ON, show_pack_badge=False))

        self.battle_with_its_page(component)

        assert component.badges.marked == frozenset()

    def test_the_own_badge_switched_off_is_sent_as_not_visible(self):
        component = self.component(dict(ON, show_pack_badge=False))

        self.battle_with_its_page(component)

        assert self.sent()[0][1]['visible'] is False

    def test_the_answer_marks_the_players_with_the_mod(self):
        component = self.component(ON)
        self.battle_with_its_page(component)

        self.transport.respond(200, b'{"account_ids":[21]}')

        assert component.badges.marked == frozenset([OWN_ACCOUNT, 21])

    def test_the_answer_shows_the_marked_and_the_other_names(self):
        component = self.component(ON)
        self.battle_with_its_page(component)

        self.transport.respond(200, b'{"account_ids":[21]}')

        assert component.bridge.shown == ([OWN_VEHICLE, 8], ['Tanker21', 'Tanker3500'], ['Tanker22'], 'site answer')

    def test_a_vehicle_added_asks_nothing_at_once(self):
        component = self.component(ON)
        self.battle_with_its_page(component)
        self.infos.append(arena_info(10, 23))

        component._on_vehicle_added()

        assert len(self.transport.requests) == 1

    def test_a_vehicle_added_starts_the_batched_lookup(self):
        component = self.component(ON)
        self.battle_with_its_page(component)

        component._on_vehicle_added()

        assert component.added_lookup.running is True

    def test_a_vehicle_added_before_the_page_starts_no_lookup(self):
        component = self.component(ON)
        component._on_battle_ready(self.player)

        component._on_vehicle_added()

        assert component.added_lookup.running is False

    def test_the_batched_lookup_asks_only_about_the_new_players(self):
        component = self.component(ON)
        self.battle_with_its_page(component)
        self.infos.append(arena_info(10, 23))
        self.infos.append(arena_info(11, 24))

        component._ask_added()

        assert self.sent()[1][1]['account_ids'] == [23, 24]

    def test_the_batched_lookup_with_no_new_player_sends_nothing(self):
        component = self.component(ON)
        self.battle_with_its_page(component)

        component._ask_added()

        assert len(self.transport.requests) == 1

    def test_the_battle_drawing_switched_off_never_touches_the_page(self):
        component = self.component(ON, is_enabled=False)

        component._on_battle_ready(self.player)

        assert component.bridge.started is False

    def test_the_battle_drawing_switched_off_sends_nothing(self):
        component = self.component(ON, is_enabled=False)

        component._on_battle_ready(self.player)

        assert self.transport.requests == []


class SwitchOffTest(BadgeComponentCase):

    def switched_off(self, key, account_id=OWN_ACCOUNT):
        component = self.component(ON)
        component.app.account_id = account_id
        component.app.config[key] = False
        return component

    def test_show_my_badge_switched_off_deletes_the_mark(self):
        component = self.switched_off('show_pack_badge')

        component._on_settings_changed('pack_badge', ['show_pack_badge'])

        assert self.sent() == [(API + '/mod/badges/presence', {
            'account_id': OWN_ACCOUNT, 'visible': False, 'account_ids': [],
        })]

    def test_the_whole_mod_switched_off_deletes_the_mark(self):
        component = self.switched_off('enabled')

        component._on_settings_changed('config', ['enabled'])

        assert self.sent()[0][1]['visible'] is False

    def test_the_plate_switched_off_deletes_the_mark(self):
        component = self.component(ON)
        component.app.account_id = OWN_ACCOUNT
        component.enabled = lambda: False

        component._on_settings_changed('pack_badge', ['battle_pack_badge'])

        assert self.sent()[0][1]['visible'] is False

    def test_the_mark_is_deleted_once(self):
        component = self.switched_off('show_pack_badge')
        component._on_settings_changed('pack_badge', ['show_pack_badge'])

        component._on_settings_changed('pack_badge', ['show_pack_badge'])

        assert len(self.transport.requests) == 1

    def test_a_switch_off_in_battle_waits_for_the_hangar(self):
        component = self.switched_off('show_pack_badge')
        component.app.in_battle = True

        component._on_settings_changed('pack_badge', ['show_pack_badge'])

        assert self.transport.requests == []

    def test_the_last_own_account_of_a_battle_serves_without_a_hangar_account(self):
        component = self.switched_off('show_pack_badge', account_id=None)
        component.last_own_account_id = OWN_ACCOUNT

        component._on_settings_changed('pack_badge', ['show_pack_badge'])

        assert self.sent()[0][1]['account_id'] == OWN_ACCOUNT

    def test_nothing_is_sent_without_any_own_account(self):
        component = self.switched_off('show_pack_badge', account_id=None)

        component._on_settings_changed('pack_badge', ['show_pack_badge'])

        assert self.transport.requests == []

    def test_a_change_that_keeps_the_badge_on_sends_nothing(self):
        component = self.component(ON)
        component.app.account_id = OWN_ACCOUNT

        component._on_settings_changed('pack_badge', ['battle_pack_badge'])

        assert self.transport.requests == []


class LibraryTest(ClientTestCase):

    def setUp(self):
        ClientTestCase.setUp(self)
        self.added = _support.stub_parents(LIBRARIES_MODULE)
        self.libraries = types.ModuleType(str(LIBRARIES_MODULE))
        self.libraries.BATTLE_REQUIRED_LIBRARIES = ['windows.swf']
        sys.modules[LIBRARIES_MODULE] = self.libraries
        self.flash = importlib.import_module('otmetki.features.pack_badge.client.flash')

    def tearDown(self):
        _support.drop_modules([LIBRARIES_MODULE] + self.added)
        ClientTestCase.tearDown(self)

    def test_the_switch_on_loads_the_library_with_the_battle_app(self):
        self.flash.set_library(True)

        assert self.libraries.BATTLE_REQUIRED_LIBRARIES == ['windows.swf', 'otmetki_pack_badge.swf']

    def test_the_switch_off_takes_it_out_again(self):
        self.flash.set_library(True)

        self.flash.set_library(False)

        assert self.libraries.BATTLE_REQUIRED_LIBRARIES == ['windows.swf']


if __name__ == '__main__':
    unittest.main()
