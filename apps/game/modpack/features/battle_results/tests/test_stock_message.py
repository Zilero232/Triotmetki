# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import collections
import importlib
import os
import sys
import types
import unittest

import _support
from otmetki.core.hooks import restore

CLIENT_PACKAGE = 'otmetki.features.battle_results.client'
CLIENT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'client')
FORMATTER_MODULE = 'messenger.formatters.service_channel'
MessageData = collections.namedtuple('MessageData', 'data, settings')
Message = collections.namedtuple('Message', 'data')
ARENA = 42


class BattleResultsFormatter(object):

    def format(self, message, callback=None):
        def caller(callback):
            callback([MessageData({'message': u'Победа!', 'savedData': ARENA}, None)])
        return caller


def load_hook():
    package = types.ModuleType(str(CLIENT_PACKAGE))
    package.__path__ = [CLIENT_DIR]
    sys.modules[CLIENT_PACKAGE] = package
    return importlib.import_module(CLIENT_PACKAGE + '.stock_message')


def forget_hook():
    _support.forget_modules(CLIENT_PACKAGE)


def install_formatter():
    added = _support.stub_parents(FORMATTER_MODULE)
    module = types.ModuleType(str(FORMATTER_MODULE))
    module.BattleResultsFormatter = BattleResultsFormatter
    sys.modules[FORMATTER_MODULE] = module
    return added + [FORMATTER_MODULE]


class StockMessageHookTest(unittest.TestCase):

    def setUp(self):
        self.stubs = install_formatter()
        self.seen = []
        self.hook = load_hook().StockMessageHook(self.on_message)

    def tearDown(self):
        restore(BattleResultsFormatter, 'format')
        _support.drop_modules(self.stubs)
        forget_hook()

    def on_message(self, arena, messages, callback):
        self.seen.append(arena)
        messages[0].data['message'] += u'\nУрон 1'
        callback(messages)

    def shown(self):
        shown = []
        BattleResultsFormatter().format(Message({'arenaUniqueID': ARENA}))(callback=shown.extend)
        return shown

    def test_the_hook_takes_the_battle_message(self):
        self.shown()

        self.assertEqual(self.seen, [ARENA])

    def test_the_message_shows_with_the_added_lines(self):
        shown = self.shown()

        self.assertEqual(shown[0].data['message'], u'Победа!\nУрон 1')

    def test_a_failing_handler_still_lets_the_message_out(self):
        self.hook.on_message = None

        shown = self.shown()

        self.assertEqual(shown[0].data['message'], u'Победа!')


if __name__ == '__main__':
    unittest.main()
