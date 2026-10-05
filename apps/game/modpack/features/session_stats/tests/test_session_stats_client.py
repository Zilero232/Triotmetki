from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.companion.account_state import AccountState
from otmetki.core.events import EVENT_COMPONENT_SETTINGS, EventBus
from otmetki.core.hud import ComponentConfig
from otmetki.core.storage import MemoryFile
from otmetki.features.session_stats.i18n import STRINGS
from otmetki.features.session_stats.settings import IDLE_MINUTES, SECTION

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.session_stats.client')
ARENA = 4242
TANK = 1


class Avatar(object):
    arenaUniqueID = ARENA
    arenaBonusType = 1


class Config(object):

    def __init__(self):
        self.values = {IDLE_MINUTES: 60, 'share_session_report': False, 'share_session_channel': 'telegram'}

    def get(self, key):
        return self.values.get(key)

    def is_enabled(self, switch):
        return False


class Marks(object):

    def before_battle(self, arena_id, tank_id):
        return {'damage_rating': 8000}


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator(STRINGS, 'en')
        self.config = Config()
        self.state = {}
        self.account_state = AccountState()
        self.switch_account(1)
        self.in_battle = True
        self.auth_failed = False
        self.marks = Marks()

    def register_state(self, key, dump):
        pass

    def register_account_state(self, key, dump, load):
        self.account_state.register(self.state, key, dump, load)

    def switch_account(self, account_id):
        self.state = self.account_state.switch(self.state, account_id)
        self.account_id = account_id
        self.bus.emit('account', account_id)

    def save_state(self):
        pass

    def is_bound(self):
        return False


def battle_event():
    return {
        'arena_unique_id': str(ARENA),
        'bonus_type': 1,
        'result': 'win',
        'vehicle': {'tank_id': TANK},
        'stats': {'damage_dealt': 1000},
        'moe': {'damage_rating': 8100},
    }


class SessionStatsClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        self.purge()
        sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
        hud = importlib.import_module('otmetki.core.client.hud')
        self.saved_config = hud._state['config']
        hud._state['config'] = ComponentConfig(MemoryFile())
        self.hud = hud
        self.app = App()
        self.stats = importlib.import_module('otmetki.features.session_stats.client').SessionStats(self.app)

    def tearDown(self):
        self.hud._state['config'] = self.saved_config
        self.purge()
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    @staticmethod
    def purge():
        _support.forget_modules(CLIENT_PREFIXES)

    def test_a_battle_dropped_by_a_reset_leaves_the_new_session_marks_alone(self):
        self.app.bus.emit('battle_ready', Avatar())
        self.stats.reset()

        self.app.bus.emit('battle_event', battle_event(), 1000.0)

        assert self.stats.moe.rows(self.stats.session.session_id, 5) == []

    def test_a_counted_battle_records_its_marks_change(self):
        self.app.bus.emit('battle_event', battle_event(), 1000.0)

        assert [row['change'] for row in self.stats.moe.rows(self.stats.session.session_id, 5)] == [1.0]

    def test_another_account_starts_without_the_first_ones_session(self):
        self.app.bus.emit('battle_event', battle_event(), 1000.0)

        self.app.switch_account(2)

        assert self.stats.session.session_id is None

    def test_another_account_starts_without_the_first_ones_session_marks(self):
        self.app.bus.emit('battle_event', battle_event(), 1000.0)

        self.app.switch_account(2)

        assert self.stats.moe.tanks == {}

    def test_another_account_starts_without_the_first_ones_announced_goals(self):
        self.stats.announced.newly_done([{'id': 'g1', 'status': 'achieved'}])

        self.app.switch_account(2)

        assert self.stats.announced.ids == []

    def test_the_first_account_gets_its_session_back(self):
        self.app.bus.emit('battle_event', battle_event(), 1000.0)
        session_id = self.stats.session.session_id
        self.app.switch_account(2)

        self.app.switch_account(1)

        assert self.stats.session.session_id == session_id

    def test_a_new_idle_time_applies_at_once(self):
        self.app.config.values[IDLE_MINUTES] = 10

        self.app.bus.emit(EVENT_COMPONENT_SETTINGS, SECTION, [IDLE_MINUTES])

        assert self.stats.session.idle_seconds == 600


if __name__ == '__main__':
    unittest.main()
