# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import sys
import types
import unittest

import _support  # noqa: F401
from otmetki.core.client.chat import is_own_command

STUBBED = ('messenger', 'messenger.ext', 'messenger.ext.player_helpers')


class Command(object):

    def __init__(self, sender, is_sender):
        self.sender = sender
        self.is_sender = is_sender

    def getSenderID(self):
        return self.sender

    def isSender(self):
        return self.is_sender


class OwnCommandTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        for name in STUBBED:
            stub = types.ModuleType(str(name))
            stub.__path__ = []
            sys.modules[name] = stub
        sys.modules['messenger.ext.player_helpers'].isCurrentPlayer = lambda session_id: session_id == 'me'

    def tearDown(self):
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def test_the_own_session_counts_when_the_user_storage_does_not_know_the_sender(self):
        assert is_own_command(Command('me', False))

    def test_a_command_the_client_marks_as_sent_counts_as_own(self):
        assert is_own_command(Command('someone', True))

    def test_another_players_command_is_not_own(self):
        assert not is_own_command(Command('someone', False))

    def test_a_command_that_cannot_tell_counts_as_own(self):
        assert is_own_command(object())


if __name__ == '__main__':
    unittest.main()
