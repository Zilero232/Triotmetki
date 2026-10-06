# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import os
import shutil
import stat
import sys
import tempfile
import unittest

import _support  # noqa: F401
from otmetki.companion.binding import Credentials, CredentialStore
from otmetki.core.durable import MirroredFile, PrivateFile, open_config, open_secret_pair
from otmetki.core.durable.constants import STAMPS_NAME
from otmetki.core.durable.paths import durable_dir, to_path_text
from otmetki.core.hud import ComponentConfig
from otmetki.core.settings import Schema
from otmetki.core.storage import JsonFile

SECRET = 's' * 20 + 't' * 20
MIRRORED_NAMES = ('config.json', 'components.json', 'profiles.json', 'state.json')


class ReverseBox(object):

    def available(self):
        return True

    def seal(self, secret):
        return secret[::-1]

    def open(self, sealed):
        return sealed[::-1] if sealed else None


class Clock(object):

    def __init__(self, now=1000.0):
        self.now = now

    def __call__(self):
        self.now += 10.0
        return self.now


def _read(path):
    with io.open(path, 'r', encoding='utf-8') as handle:
        return json.load(handle)


def _write_raw(path, data, mtime):
    directory = os.path.dirname(path)
    if not os.path.isdir(directory):
        os.makedirs(directory)
    with io.open(path, 'w', encoding='utf-8') as handle:
        handle.write(json.dumps(data, ensure_ascii=False))
    os.utime(path, (mtime, mtime))


def _stamp(directory, name):
    return _read(os.path.join(directory, STAMPS_NAME))['files'][name]


class DurableTestCase(unittest.TestCase):

    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.game = os.path.join(self.root, 'mods', 'configs', 'otmetki')
        self.appdata = os.path.join(self.root, 'AppData', 'TriOtmetki')
        self.clock = Clock()

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def open(self, name='config.json'):
        return MirroredFile(self.game, self.appdata, name, pretty=True, clock=self.clock)

    def game_file(self, name='config.json'):
        return os.path.join(self.game, name)

    def durable_file(self, name='config.json'):
        return os.path.join(self.appdata, name)

    def wipe_game_folder(self):
        shutil.rmtree(os.path.join(self.root, 'mods'))

    def make_durable_folder_a_file(self):
        os.makedirs(os.path.dirname(self.appdata))
        with io.open(self.appdata, 'w', encoding='utf-8') as handle:
            handle.write('not a folder')

    def open_components(self):
        storage = open_config(self.game, 'components.json', pretty=True, mirror_dir=self.appdata)
        return ComponentConfig(storage)

    def open_credentials(self):
        return CredentialStore(open_secret_pair(self.game, 'credentials.json', private_dir=self.appdata), ReverseBox())


class MirroredFileTest(DurableTestCase):

    def test_write_goes_to_both_copies_with_one_stamp(self):
        self.open().write({'enabled': True})

        self.assertEqual(_read(self.game_file()), {'enabled': True})
        self.assertEqual(_read(self.durable_file()), {'enabled': True})
        self.assertEqual(_stamp(self.game, 'config.json'), 1010.0)
        self.assertEqual(_stamp(self.appdata, 'config.json'), 1010.0)

    def test_wiped_game_folder_is_restored_on_load(self):
        self.open().write({'language': 'en'})
        self.wipe_game_folder()

        loaded = self.open().read({})

        self.assertEqual(loaded, {'language': 'en'})
        self.assertEqual(_read(self.game_file()), {'language': 'en'})
        self.assertEqual(_stamp(self.game, 'config.json'), 1010.0)

    def test_every_mirrored_file_is_restored_after_a_wipe(self):
        self.open().write({'language': 'en'})
        self.open('profiles.json').write({'version': 1, 'profiles': []})
        self.wipe_game_folder()

        loaded = self.open('profiles.json').read()

        self.assertEqual(loaded, {'version': 1, 'profiles': []})

    def test_missing_durable_copy_is_created_on_load(self):
        _write_raw(self.game_file(), {'enabled': False}, 500.0)

        loaded = self.open().read()

        self.assertEqual(loaded, {'enabled': False})
        self.assertEqual(_read(self.durable_file()), {'enabled': False})
        self.assertEqual(_stamp(self.appdata, 'config.json'), 500.0)

    def test_older_game_copy_loses_to_newer_durable_copy(self):
        self.open().write({'value': 'old'})
        _write_raw(self.durable_file(), {'value': 'new'}, 5000.0)

        loaded = self.open().read()

        self.assertEqual(loaded, {'value': 'new'})
        self.assertEqual(_read(self.game_file()), {'value': 'new'})

    def test_newer_game_copy_wins_over_older_durable_copy(self):
        self.open().write({'value': 'old'})
        _write_raw(self.game_file(), {'value': 'hand edited'}, 9000.0)

        loaded = self.open().read()

        self.assertEqual(loaded, {'value': 'hand edited'})
        self.assertEqual(_read(self.durable_file()), {'value': 'hand edited'})
        self.assertEqual(_stamp(self.appdata, 'config.json'), 9000.0)

    def test_equal_stamps_keep_the_game_copy(self):
        _write_raw(self.game_file(), {'side': 'game'}, 700.0)
        _write_raw(self.durable_file(), {'side': 'durable'}, 700.0)

        loaded = self.open().read()

        self.assertEqual(loaded, {'side': 'game'})
        self.assertEqual(_read(self.durable_file()), {'side': 'durable'})

    def test_recorded_stamps_outweigh_older_mtimes(self):
        self.open().write({'value': 'stamped'})
        _write_raw(self.game_file(), {'value': 'copied back'}, 100.0)
        _write_raw(self.durable_file(), {'value': 'stamped'}, 100.0)

        loaded = self.open().read()

        self.assertEqual(loaded, {'value': 'copied back'})
        self.assertEqual(_read(self.durable_file()), {'value': 'stamped'})

    def test_unreadable_game_copy_is_restored(self):
        self.open().write({'value': 1})
        with io.open(self.game_file(), 'w', encoding='utf-8') as handle:
            handle.write('{broken')

        loaded = self.open().read()

        self.assertEqual(loaded, {'value': 1})

    def test_nothing_anywhere_gives_the_default(self):
        loaded = self.open().read('fallback')

        self.assertEqual(loaded, 'fallback')
        self.assertFalse(os.path.exists(self.appdata))

    def test_failing_durable_side_never_fails_the_save(self):
        self.make_durable_folder_a_file()
        storage = self.open()

        storage.write({'enabled': True})

        self.assertEqual(_read(self.game_file()), {'enabled': True})
        self.assertTrue(os.path.isfile(self.appdata))

    def test_failing_durable_side_still_reads_the_game_copy(self):
        self.make_durable_folder_a_file()
        storage = self.open()
        storage.write({'enabled': True})

        loaded = storage.read()

        self.assertEqual(loaded, {'enabled': True})

    def test_delete_removes_both_copies(self):
        storage = self.open()
        storage.write({'enabled': True})

        storage.delete()

        self.assertEqual(self.open().read('gone'), 'gone')

    def test_cyrillic_folders(self):
        self.game = os.path.join(self.root, 'Игры', 'Мир танков', 'mods', 'configs', 'otmetki')
        self.appdata = os.path.join(self.root, 'Пользователь', 'AppData', 'Roaming', 'TriOtmetki')
        self.open().write({'name': 'Три отметки'})
        shutil.rmtree(os.path.join(self.root, 'Игры'))

        loaded = self.open().read()

        self.assertEqual(loaded, {'name': 'Три отметки'})


class WipeAndRestoreTest(DurableTestCase):

    def test_binding_and_layout_survive_a_wiped_configs_folder(self):
        schema = Schema({'x': 10, 'visible': True})
        self.open_credentials().save(Credentials('device-1', SECRET, 42, 1700000000))
        self.open_components().section('damage_log', schema)
        config = self.open_components()
        config.section('damage_log', schema)
        config.update('damage_log', {'x': 250})

        self.wipe_game_folder()

        restored = self.open_credentials()
        layout = self.open_components()
        self.assertEqual(restored.get(42).device_id, 'device-1')
        self.assertEqual(layout.section('damage_log', schema).get('x'), 250)
        self.assertEqual(_read(self.game_file('credentials.json')), {
            'accounts': {'42': {'device_id': 'device-1', 'account_id': 42, 'bound_at': 1700000000}},
        })


class SecretPairTest(DurableTestCase):

    def test_credentials_are_not_mirrored(self):
        with self.assertRaises(ValueError):
            open_config(self.game, 'credentials.json', mirror_dir=self.appdata)

    def test_the_halves_live_in_the_two_folders(self):
        pair = open_secret_pair(self.game, 'credentials.json', private_dir=self.appdata)

        self.assertEqual(pair.public.path, self.game_file('credentials.json'))
        self.assertIsInstance(pair.private, PrivateFile)
        self.assertEqual(pair.private.path, self.durable_file('credentials.json'))

    def test_no_durable_folder_means_no_private_half(self):
        self.assertIsNone(open_secret_pair(self.game, 'credentials.json', private_dir=None).private)
        self.assertIsNone(open_secret_pair(self.game, 'credentials.json', private_dir=self.game).private)

    def test_the_secret_never_reaches_either_file_in_plain_text(self):
        self.open_credentials().save(Credentials('device-1', SECRET, 42, 1700000000))

        for path in (self.game_file('credentials.json'), self.durable_file('credentials.json')):
            with io.open(path, 'r', encoding='utf-8') as handle:
                self.assertNotIn(SECRET, handle.read())

    @unittest.skipIf(sys.platform == 'win32', 'Windows has no owner-only mode bits; the per-user %APPDATA% ACL applies')
    def test_the_private_half_is_owner_only(self):
        pair = open_secret_pair(self.game, 'credentials.json', private_dir=self.appdata)
        pair.private.write({'accounts': {}})

        mode = stat.S_IMODE(os.stat(self.durable_file('credentials.json')).st_mode)
        self.assertEqual(mode, 0o600)


class OpenConfigTest(DurableTestCase):

    def test_other_files_stay_plain(self):
        storage = open_config(self.game, 'outbox_42.json', mirror_dir=self.appdata)

        self.assertIsInstance(storage, JsonFile)

    def test_no_durable_folder_means_plain_file(self):
        storage = open_config(self.game, 'config.json', mirror_dir=None)

        self.assertIsInstance(storage, JsonFile)

    def test_durable_files_are_mirrored(self):
        for name in MIRRORED_NAMES:
            storage = open_config(self.game, name, mirror_dir=self.appdata)

            self.assertIsInstance(storage, MirroredFile)

    def test_default_folder_comes_from_appdata(self):
        storage = open_config(self.game, 'config.json')

        self.assertEqual(os.path.dirname(storage.mirror.path), durable_dir())


class DurableDirTest(unittest.TestCase):

    def test_appdata(self):
        roaming = os.path.join('C:', 'Users', 'Игрок', 'AppData', 'Roaming')

        directory = durable_dir({'APPDATA': roaming}, 'win32')

        self.assertEqual(directory, os.path.join('C:', 'Users', 'Игрок', 'AppData', 'Roaming', 'TriOtmetki'))

    def test_appdata_as_bytes_in_the_file_system_encoding(self):
        folder = os.path.join('C:', 'Users', 'Игрок')
        try:
            encoded = folder.encode(sys.getfilesystemencoding() or 'utf-8')
        except LookupError:
            encoded = folder.encode('utf-8')

        directory = durable_dir({'APPDATA': encoded}, 'win32')

        self.assertEqual(directory, os.path.join(folder, 'TriOtmetki'))

    def test_windows_fallback_to_the_home_folder(self):
        home = os.path.join('C:', 'Users', 'Игрок')

        directory = durable_dir({}, 'win32', lambda path: home)

        self.assertEqual(directory, os.path.join(home, 'AppData', 'Roaming', 'TriOtmetki'))

    def test_posix_fallback(self):
        directory = durable_dir({}, 'linux2', lambda path: '/home/player')

        self.assertEqual(directory, os.path.join('/home/player', '.config', 'TriOtmetki'))

    def test_unknown_home(self):
        self.assertIsNone(durable_dir({}, 'win32', lambda path: path))


class PathTextTest(unittest.TestCase):

    def test_none_stays_none(self):
        self.assertIsNone(to_path_text(None))

    def test_text_stays_text(self):
        self.assertEqual(to_path_text('путь'), 'путь')

    def setUp(self):
        self.filesystem_encoding = sys.getfilesystemencoding

    def tearDown(self):
        sys.getfilesystemencoding = self.filesystem_encoding

    def test_bytes_decode_in_the_filesystem_encoding(self):
        sys.getfilesystemencoding = lambda: 'cp1251'

        self.assertEqual(to_path_text('путь'.encode('cp1251')), 'путь')

    def test_utf8_bytes_decode_when_the_filesystem_encoding_cannot(self):
        sys.getfilesystemencoding = lambda: 'ascii'

        self.assertEqual(to_path_text('путь'.encode('utf-8')), 'путь')


if __name__ == '__main__':
    unittest.main()
