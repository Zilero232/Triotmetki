from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.companion.account_state import AccountState
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig
from otmetki.core.native_settings import ACTION_RECOMMENDED, ACTION_RESTORE, NATIVE
from otmetki.core.settings import Schema
from _support import MemoryFile

CLIENT_PREFIX = 'otmetki.core.client'
SCHEMA = Schema({'zoom': 'x8'}, choices={'zoom': (NATIVE, 'x4', 'x8')})
ZOOMS = {'x4': 4, 'x8': 8}
GAME_ZOOM = 4
FIRST_ACCOUNT = 1
SECOND_ACCOUNT = 2


def to_native(values):
    zoom = ZOOMS.get(values.get('zoom'))
    if zoom is None:
        return {}
    return {'sniperZoom': zoom}


class Config(object):

    def is_enabled(self, switch):
        return True

    def get(self, key):
        return None


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator({'ru': {}, 'en': {}})
        self.config = Config()
        self.in_battle = False
        self.state = {}
        self.parts = []
        self.account_state = AccountState()

    def register_state(self, key, dump):
        self.parts.append((key, dump))

    def register_account_state(self, key, dump, load):
        self.account_state.register(self.state, key, dump, load)

    def save_state(self):
        data = dict(self.state)
        for key, dump in self.parts:
            data[key] = dump()
        self.state = self.account_state.saved(data)

    def switch_account(self, account_id):
        self.state = self.account_state.switch(self.state, account_id)


class Client(object):

    def __init__(self):
        self.values = {'sniperZoom': GAME_ZOOM}
        self.accepts = True

    def read(self, names):
        return {name: self.values[name] for name in names if name in self.values}

    def apply(self, values):
        if not self.accepts:
            return False
        self.values.update(values)
        return True


def load(client):
    saved = sys.modules.get('BigWorld')
    sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
    try:
        hud = importlib.import_module('otmetki.core.client.hud')
        hud._state['config'] = ComponentConfig(MemoryFile())
        defaults = importlib.import_module('otmetki.core.client.native.defaults')
        defaults.read_settings = client.read
        defaults.apply_settings = client.apply
        component = importlib.import_module('otmetki.core.client.native.component')
        component.apply_changed = client.apply
        return component.RecommendedSettingsComponent
    finally:
        if saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = saved
        _support.forget_modules(CLIENT_PREFIX)


class RecommendedTest(unittest.TestCase):

    def setUp(self):
        self.client = Client()
        component_class = load(self.client)
        self.app = App()
        self.app.switch_account(FIRST_ACCOUNT)
        self.component = component_class(self.app, 'zoom', SCHEMA, 'zoom', {}, to_native)
        self.app.bus.emit('hangar')

    def offered(self):
        return [action['id'] for action in self.component.ui_actions()]

    def test_the_recommendation_is_offered_on_a_native_section(self):
        assert self.offered() == [ACTION_RECOMMENDED]

    def test_the_recommendation_writes_the_client_setting(self):
        self.component.ui_action(ACTION_RECOMMENDED)

        assert self.client.values['sniperZoom'] == 8

    def test_the_recommendation_then_offers_the_restore(self):
        self.component.ui_action(ACTION_RECOMMENDED)

        assert self.offered() == [ACTION_RESTORE]

    def test_a_refused_write_reports_the_failure(self):
        self.client.accepts = False

        notice = self.component.ui_action(ACTION_RECOMMENDED)

        assert notice['kind'] == 'error'

    def test_another_account_is_not_offered_the_restore(self):
        self.component.ui_action(ACTION_RECOMMENDED)

        self.app.switch_account(SECOND_ACCOUNT)

        assert ACTION_RESTORE not in self.offered()

    def test_the_account_that_kept_the_backup_gets_its_restore_back(self):
        self.component.ui_action(ACTION_RECOMMENDED)
        self.app.switch_account(SECOND_ACCOUNT)

        self.app.switch_account(FIRST_ACCOUNT)

        assert self.offered() == [ACTION_RESTORE]

    def test_the_restore_puts_back_the_game_value_of_that_account(self):
        self.component.ui_action(ACTION_RECOMMENDED)
        self.app.switch_account(SECOND_ACCOUNT)
        self.app.switch_account(FIRST_ACCOUNT)

        self.component.ui_action(ACTION_RESTORE)

        assert self.client.values['sniperZoom'] == GAME_ZOOM


if __name__ == '__main__':
    unittest.main()
