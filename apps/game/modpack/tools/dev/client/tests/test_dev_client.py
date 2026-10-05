# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import shutil
import sys
import tempfile
import unittest

TOOLS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

from dev import client  # noqa: E402
from dev.testing import CLIENT_145_PATHS_XML, lesta_client, write, write_lgc, write_version_xml  # noqa: E402


class ParseTest(unittest.TestCase):

    def test_reads_the_version_and_realm_from_version_xml(self):
        text = '<version.xml><version>\tv.1.45.0.0 #8259\t</version><meta><realm> RU </realm></meta></version.xml>'

        version, realm = client.parse_version_xml(text)

        self.assertEqual(version, (1, 45, 0, 0))
        self.assertEqual(realm, 'RU')

    def test_pads_a_short_version_and_rejects_garbage(self):
        self.assertEqual(client.parse_version('1.45.0'), (1, 45, 0, 0))
        self.assertIsNone(client.parse_version('garbage'))
        self.assertIsNone(client.parse_version('1'))

    def test_supports_lesta_clients_from_1_35_on(self):
        self.assertTrue(client.is_supported((1, 35, 0, 0)))
        self.assertFalse(client.is_supported((1, 34, 9, 0)))
        self.assertFalse(client.is_supported((2, 4, 1, 0)))

    def test_reads_the_packages_root_and_res_mods_from_paths_xml(self):
        text = '<root><Paths><Path>./res_mods/1.45.0.0</Path><Packages><Root>./mods/1.45.0.0</Root>' \
               '<Mask>*.mtmod</Mask></Packages><Path>./res</Path></Paths></root>'

        paths = client.parse_paths_xml(text)

        self.assertEqual(paths, {'mods': './mods/1.45.0.0', 'res_mods': './res_mods/1.45.0.0', 'mask': '*.mtmod'})

    def test_refuses_folders_that_leave_the_client(self):
        self.assertIsNone(client.join_relative('C:\\Games\\Tanki', '../../mods'))
        self.assertIsNone(client.join_relative('C:\\Games\\Tanki', 'C:/Windows/mods'))

    def test_decodes_utf16_files_with_a_bom(self):
        data = '\ufeffD:\\Игры\\Мир танков'.encode('utf-16-le')

        self.assertEqual(client.decode_text(data), 'D:\\Игры\\Мир танков')

    def test_reads_the_first_selected_game_from_lgc_preferences(self):
        text = '<p><games><game><working_dir> D:\\A </working_dir></game></games>' \
               '<selectedGames><WOT>D:\\A</WOT></selectedGames></p>'

        clients, selected = client.parse_preferences(text)

        self.assertEqual(clients, ['D:\\A'])
        self.assertEqual(selected, 'D:\\A')

    def test_tolerates_broken_preferences(self):
        self.assertEqual(client.parse_preferences('<not xml'), ([], None))


class TreeTest(unittest.TestCase):

    def setUp(self):
        self.root = tempfile.mkdtemp(prefix='otmetki-dev-client-')

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_inspects_a_lesta_client_in_a_cyrillic_folder(self):
        folder = lesta_client(self.root, os.path.join('Игры', 'Мир танков'))

        found = client.inspect(folder, 'manual')

        self.assertEqual(found.version_text, '1.45.0.0')
        self.assertEqual(found.mods_dir, os.path.join(folder, 'mods', '1.45.0.0'))
        self.assertIsNone(found.problem)

    def test_falls_back_to_mods_version_with_the_1_45_paths_xml(self):
        folder = lesta_client(self.root, 'Tanki', paths_xml=CLIENT_145_PATHS_XML)

        found = client.inspect(folder, 'manual')

        self.assertEqual(found.mods_dir, os.path.join(folder, 'mods', '1.45.0.0'))
        self.assertEqual(found.res_mods_dir, os.path.join(folder, 'res_mods', '1.45.0.0'))

    def test_ignores_a_packages_root_outside_the_client(self):
        folder = lesta_client(self.root, 'Tanki')
        write(os.path.join(folder, 'paths.xml'), '<root><Paths><Packages><Root>C:/Windows/mods</Root></Packages>'
                                                 '</Paths></root>')

        found = client.inspect(folder, 'manual')

        self.assertEqual(found.mods_dir, os.path.join(folder, 'mods', '1.45.0.0'))

    def test_flags_wargaming_and_old_clients(self):
        write_version_xml(os.path.join(self.root, 'wg'), '2.4.1.0', 'EU')
        write_version_xml(os.path.join(self.root, 'old'), '1.30.0.0', 'RU')

        self.assertEqual(client.inspect(os.path.join(self.root, 'wg'), 'manual').problem, 'not_lesta')
        self.assertEqual(client.inspect(os.path.join(self.root, 'old'), 'manual').problem, 'old_version')

    def test_marks_the_common_test_client(self):
        write_version_xml(os.path.join(self.root, 'ct'), '1.46.0.0', 'RPT')

        self.assertTrue(client.inspect(os.path.join(self.root, 'ct'), 'manual').is_common_test)

    def test_an_empty_folder_is_not_a_client(self):
        self.assertIsNone(client.inspect(self.root, 'manual'))

    def test_detects_every_lgc_client_and_the_preferred_one(self):
        release = lesta_client(self.root, 'Мир танков')
        common_test = lesta_client(self.root, 'Общий тест', version='1.46.0.0')
        program_data = os.path.join(self.root, 'ProgramData')
        write_lgc(program_data, os.path.join(self.root, 'Lesta Game Center'), [release, common_test], common_test)

        clients = client.detect_clients(program_data)

        self.assertEqual([found.path for found in clients], [release, common_test])
        self.assertEqual(client.default_client(clients).path, common_test)

    def test_adds_manual_clients_once(self):
        release = lesta_client(self.root, 'Tanki')
        program_data = os.path.join(self.root, 'ProgramData')
        write_lgc(program_data, os.path.join(self.root, 'lgc'), [release])

        clients = client.detect_clients(program_data, [release.upper(), os.path.join(self.root, 'nothing')])

        self.assertEqual([found.source for found in clients], ['lgc'])

    def test_reads_lgc_path_dat_pointing_at_the_executable(self):
        lgc = os.path.join(self.root, 'Lesta', 'GameCenter')
        write(os.path.join(lgc, 'data', 'lgc_path.dat'), os.path.join(lgc, 'lgc.exe'))

        self.assertEqual(client.lgc_dir(self.root), lgc)

    def test_works_without_lesta_game_center(self):
        self.assertEqual(client.detect_clients(self.root), [])


class FindClientTest(unittest.TestCase):

    def setUp(self):
        self.root = tempfile.mkdtemp(prefix='otmetki-dev-find-')
        self.program_data = os.path.join(self.root, 'ProgramData')
        self.roaming = os.path.join(self.root, 'Roaming')

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def environ(self, **extra):
        values = {'PROGRAMDATA': self.program_data, 'OTMETKI_ROAMING_ROOT': self.roaming}
        values.update(extra)
        return values

    def test_the_game_dir_variable_wins(self):
        listed = lesta_client(self.root, 'Listed')
        explicit = lesta_client(self.root, 'Explicit')
        write_lgc(self.program_data, os.path.join(self.root, 'lgc'), [listed], listed)

        found = client.find_client(self.environ(OTMETKI_GAME_DIR=explicit))

        self.assertEqual(found.path, explicit)

    def test_a_game_dir_variable_spelt_with_slashes_names_the_same_client(self):
        explicit = lesta_client(self.root, 'Explicit')
        spelt = explicit.replace(os.sep, '/') + '/'

        found = client.find_client(self.environ(OTMETKI_GAME_DIR=spelt))

        self.assertEqual(found.path, explicit)

    def test_a_game_dir_variable_without_a_client_is_an_error(self):
        with self.assertRaises(client.ClientError):
            client.find_client(self.environ(OTMETKI_GAME_DIR=self.root))

    def test_the_managers_selected_client_wins_over_lgc(self):
        first = lesta_client(self.root, 'First')
        second = lesta_client(self.root, 'Second')
        write_lgc(self.program_data, os.path.join(self.root, 'lgc'), [first, second], first)
        settings = '{"selectedClient": %s, "manualClients": []}' % ('"%s"' % second.replace('\\', '\\\\'))
        write(os.path.join(self.roaming, 'manager', 'settings.json'), settings)

        found = client.find_client(self.environ())

        self.assertEqual(found.path, second)

    def test_no_client_is_an_error_that_names_the_variable(self):
        with self.assertRaises(client.ClientError) as raised:
            client.find_client(self.environ())

        self.assertIn('OTMETKI_GAME_DIR', str(raised.exception))


if __name__ == '__main__':
    unittest.main()
