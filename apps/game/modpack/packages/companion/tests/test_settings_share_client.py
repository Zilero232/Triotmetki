from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support  # noqa: F401

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.companion.settings_share.client')
REQUEST = {'id': 'r1', 'profile_slug': 'streamer', 'values': {}}
LATER_S = 10000.0


def load_share_client():
    saved = sys.modules.get('BigWorld')
    sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
    try:
        return importlib.import_module('otmetki.companion.settings_share.client')
    finally:
        if saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = saved
        for name in [name for name in sys.modules if name.startswith(CLIENT_PREFIXES)]:
            del sys.modules[name]


class Config(object):

    def is_enabled(self, switch):
        return True

    def get(self, key):
        return False


class App(object):

    def __init__(self):
        self.in_battle = False
        self.account_id = 1
        self.auth_failed = False
        self.config = Config()

    def is_bound(self):
        return True


class SettingsShareClientTest(unittest.TestCase):

    def setUp(self):
        self.module = load_share_client()
        self.share = self.module.SettingsShare(App())

    def test_a_request_the_settings_core_could_not_read_is_asked_again(self):
        self.module.read_client_settings = lambda: None

        self.share._ask(REQUEST)

        assert 'r1' not in self.share.asked

    def test_a_poll_that_failed_to_go_out_polls_again(self):
        def failing_post(path, payload, callback):
            raise IOError('no network')
        self.share._post = failing_post
        self.module.build_poll_request = lambda credentials: {}
        self.share.app.current_credentials = lambda: None

        self.share.tick(LATER_S)

        assert self.share.polling is False


if __name__ == '__main__':
    unittest.main()
