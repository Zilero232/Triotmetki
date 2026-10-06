# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import os
import shutil
import tempfile
import unittest

import _support  # noqa: F401
from otmetki.core import storage
from otmetki.core.durable import PrivateFile, open_config, open_secret_pair
from otmetki.core.durable.constants import STAMPS_NAME
from otmetki.core.hud import ComponentConfig
from otmetki.core.settings import Schema
from otmetki.core.storage import DeferredFile, JsonFile, flush_pending
from otmetki.core.storage.constants import MOVE_REPLACE_FLAGS, MOVE_WRITE_THROUGH

DELAY_S = 1.0


class CountingFile(object):

    def __init__(self):
        self.data = None
        self.writes = 0
        self.path = 'counting.json'

    def read(self, default=None):
        return default if self.data is None else json.loads(json.dumps(self.data))

    def write(self, data):
        self.writes += 1
        self.data = json.loads(json.dumps(data))

    def delete(self):
        self.data = None


class FailingFile(CountingFile):

    def write(self, data):
        raise IOError('disk full')


class Scheduler(object):

    def __init__(self):
        self.calls = []

    def __call__(self, delay_s, callback):
        self.calls.append((delay_s, callback))

    def run(self):
        calls, self.calls = self.calls, []
        for _, callback in calls:
            callback()


class DeferredFileTest(unittest.TestCase):

    def setUp(self):
        self.store = CountingFile()
        self.schedule = Scheduler()
        self.deferred = DeferredFile(self.store, self.schedule, DELAY_S)
        self.addCleanup(flush_pending)

    def test_a_write_waits_for_the_delay(self):
        self.deferred.write({'a': 1})

        self.assertEqual(self.store.writes, 0)

    def test_writes_within_the_delay_ask_for_one_flush(self):
        for value in range(10):
            self.deferred.write({'a': value})

        self.assertEqual([delay for delay, _ in self.schedule.calls], [DELAY_S])

    def test_writes_within_the_delay_land_as_one_write_of_the_last_data(self):
        for value in range(10):
            self.deferred.write({'a': value})

        self.schedule.run()

        self.assertEqual(self.store.writes, 1)
        self.assertEqual(self.store.data, {'a': 9})

    def test_a_write_after_the_flush_asks_again(self):
        self.deferred.write({'a': 1})
        self.schedule.run()

        self.deferred.write({'a': 2})

        self.assertEqual(len(self.schedule.calls), 1)

    def test_a_read_sees_the_last_write(self):
        self.deferred.write({'a': 1})

        self.assertEqual(self.deferred.read(), {'a': 1})

    def test_flush_pending_writes_every_held_file(self):
        other_store = CountingFile()
        other = DeferredFile(other_store, self.schedule, DELAY_S)
        self.deferred.write({'a': 1})
        other.write({'b': 2})

        flush_pending()

        self.assertEqual((self.store.data, other_store.data), ({'a': 1}, {'b': 2}))

    def test_the_due_flush_after_flush_pending_writes_nothing_more(self):
        self.deferred.write({'a': 1})
        flush_pending()

        self.schedule.run()

        self.assertEqual(self.store.writes, 1)

    def test_a_failed_write_is_logged_not_raised(self):
        deferred = DeferredFile(FailingFile(), self.schedule, DELAY_S)
        deferred.write({'a': 1})

        self.assertFalse(deferred.flush())

    def test_a_delete_drops_the_held_write(self):
        self.deferred.write({'a': 1})

        self.deferred.delete()
        self.schedule.run()

        self.assertEqual(self.store.writes, 0)


class DeferredComponentConfigTest(unittest.TestCase):

    def setUp(self):
        self.store = CountingFile()
        self.schedule = Scheduler()
        self.config = ComponentConfig(DeferredFile(self.store, self.schedule, DELAY_S))
        self.addCleanup(flush_pending)

    def test_the_sections_of_a_first_start_are_saved_in_one_write(self):
        for index in range(30):
            self.config.section('panel_%d' % index, Schema({'x': index}))

        self.schedule.run()

        self.assertEqual(self.store.writes, 1)
        self.assertEqual(len(self.store.data), 30)

    def test_a_wheel_turn_per_frame_is_saved_once(self):
        self.config.section('damage_log', Schema({'scale': 100}))
        self.schedule.run()

        for scale in range(101, 131):
            self.config.update('damage_log', {'scale': scale})
        self.schedule.run()

        self.assertEqual(self.store.writes, 2)
        self.assertEqual(self.store.data['damage_log']['scale'], 130)


class MirroredStampsTest(unittest.TestCase):

    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.root)
        self.game = os.path.join(self.root, 'game')
        self.appdata = os.path.join(self.root, 'appdata')
        self.clock = iter(1000.0 + step for step in range(100))

    def open(self, name='config.json'):
        return open_config(self.game, name, mirror_dir=self.appdata, clock=lambda: next(self.clock))

    def stamps(self, directory):
        with io.open(os.path.join(directory, STAMPS_NAME), encoding='utf-8') as handle:
            return json.load(handle)['files']

    def test_files_of_one_folder_keep_each_others_stamps(self):
        config = self.open('config.json')
        state = self.open('state.json')

        config.write({'a': 1})
        state.write({'b': 2})

        self.assertEqual(sorted(self.stamps(self.game)), ['config.json', 'state.json'])
        self.assertEqual(sorted(self.stamps(self.appdata)), ['config.json', 'state.json'])

    def test_a_write_does_not_read_the_stamps_back(self):
        config = self.open()
        config.write({'a': 1})
        reads = []
        original = JsonFile.read

        def counting_read(file_self, default=None):
            reads.append(file_self.path)
            return original(file_self, default)

        JsonFile.read = counting_read
        self.addCleanup(setattr, JsonFile, 'read', original)
        config.write({'a': 2})

        self.assertEqual([path for path in reads if path.endswith(STAMPS_NAME)], [])

    def test_a_read_picks_up_stamps_another_program_wrote(self):
        config = self.open()
        config.write({'a': 'game'})
        later = 5000.0
        JsonFile(os.path.join(self.appdata, 'config.json')).write({'a': 'manager'})
        os.utime(os.path.join(self.appdata, 'config.json'), (later, later))
        JsonFile(os.path.join(self.appdata, STAMPS_NAME)).write({'version': 1, 'files': {'config.json': later}})

        loaded = self.open().read()

        self.assertEqual(loaded, {'a': 'manager'})


class WriteThroughTest(unittest.TestCase):

    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.root)
        self.moves = []
        original = storage._move_over
        storage._move_over = lambda src, dst, write_through: self.moves.append(write_through) or False
        self.addCleanup(setattr, storage, '_move_over', original)

    def test_a_settings_file_does_not_wait_for_the_disk(self):
        JsonFile(os.path.join(self.root, 'components.json')).write({})

        self.assertEqual(self.moves, [False])

    def test_the_private_half_of_the_binding_waits_for_the_disk(self):
        PrivateFile(os.path.join(self.root, 'credentials.json')).write({})

        self.assertEqual(self.moves, [True])

    def test_the_game_folder_half_of_the_binding_waits_for_the_disk(self):
        pair = open_secret_pair(os.path.join(self.root, 'game'), 'credentials.json', private_dir=None)

        pair.public.write({})

        self.assertEqual(self.moves, [True])

    def test_the_write_through_flag_is_its_own_bit(self):
        self.assertEqual(MOVE_REPLACE_FLAGS & MOVE_WRITE_THROUGH, 0)
