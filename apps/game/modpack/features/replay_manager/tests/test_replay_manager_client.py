from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.replay_manager.client')


class Library(object):

    def __init__(self, pending):
        self.pending = pending
        self.slices = 0
        self.saved = 0

    def indexing(self):
        return self.pending > 0

    def index(self, clock, budget_s=None):
        self.slices += 1
        self.pending -= 1
        return 1

    def save(self):
        self.saved += 1


class IndexFrameTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        _support.forget_modules(CLIENT_PREFIXES)
        self.callbacks = []
        big_world = types.ModuleType(str('BigWorld'))
        big_world.callback = lambda delay, callback: self.callbacks.append((delay, callback))
        sys.modules['BigWorld'] = big_world
        self.client = importlib.import_module('otmetki.features.replay_manager.client')
        self.manager = self.client.ReplayManager.__new__(self.client.ReplayManager)
        self.manager.library = Library(3)
        self.manager.wanted_at = self.client.time.time()
        self.manager.enabled_in_hangar = lambda: True
        self.manager.index_ticker = self.client.Ticker(self.client.INDEX_FRAME_S, self.manager._index_frame)

    def tearDown(self):
        _support.forget_modules(CLIENT_PREFIXES)
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    def run_frames(self, count):
        for _ in range(count):
            pending = self.callbacks
            self.callbacks = []
            for _, callback in pending:
                callback()

    def test_the_headers_are_read_one_slice_a_frame(self):
        self.manager.index_ticker.start()

        self.run_frames(2)

        self.assertEqual(self.manager.library.slices, 2)

    def test_the_slices_run_on_the_next_frame(self):
        self.manager.index_ticker.start()

        self.assertEqual([delay for delay, _ in self.callbacks], [0.0])

    def test_the_frames_stop_once_every_header_is_read(self):
        self.manager.index_ticker.start()

        self.run_frames(10)

        self.assertFalse(self.manager.index_ticker.running)

    def test_the_frames_stop_once_the_window_no_longer_wants_the_page(self):
        self.manager.wanted_at = 0.0
        self.manager.index_ticker.start()

        self.run_frames(1)

        self.assertEqual(self.manager.library.slices, 0)


if __name__ == '__main__':
    unittest.main()
