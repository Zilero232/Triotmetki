from __future__ import absolute_import, division, print_function, unicode_literals

import os
import shutil
import sys
import tempfile
import unittest
import zipfile
from StringIO import StringIO

import contextlib2

import _support  # noqa: F401

BUILD_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BUILD_DIR not in sys.path:
    sys.path.insert(0, BUILD_DIR)

import archive  # noqa: E402
import build  # noqa: E402
import compilers  # noqa: E402
import layout  # noqa: E402

MODS = layout.MODS_ROOT + '/'
FEATURES = layout.feature_ids()
EXTENSIONS = layout.extension_ids()
UI_ASSETS = layout.GAMEFACE_ROOT + '/ui/'
NO_COMPILER = (None, None)


def every_path(packages):
    return [archive_path for package in packages for _, archive_path in package.files]


def package_output(outputs, marker):
    return [path for path in outputs if marker in path][0]


def zip_names(path):
    with zipfile.ZipFile(path) as package:
        return package.namelist()


class LayoutTest(unittest.TestCase):

    def setUp(self):
        self.packages = layout.split_packages('root_init.py')
        self.by_key = dict((package.key, package) for package in self.packages)

    def paths(self, key):
        return [archive_path for _, archive_path in self.by_key[key].files]

    def test_there_is_a_package_per_core_companion_extension_and_feature(self):
        keys = sorted(self.by_key)

        self.assertEqual(keys, sorted(['companion', 'core'] + EXTENSIONS + FEATURES))

    def test_package_ids_follow_the_net_triotmetki_prefix(self):
        self.assertEqual(self.by_key['ui'].package_id, 'net.triotmetki.ui')
        self.assertEqual(self.by_key['core'].package_id, 'net.triotmetki.core')
        self.assertEqual(self.by_key['replay_upload'].package_id, 'net.triotmetki.replay_upload')
        for key in ('damage_log', 'hangar_info', 'team_hp', 'battle_results', 'sixth_sense'):
            self.assertEqual(self.by_key[key].package_id, 'net.triotmetki.' + key)

    def test_the_companion_keeps_its_historic_id(self):
        self.assertEqual(self.by_key['companion'].package_id, 'otmetki.companion')

    def test_core_depends_on_nothing_and_the_companion_on_core(self):
        core = self.by_key['core']

        self.assertEqual(core.depends, ())
        self.assertEqual(self.by_key['companion'].depends, (core,))

    def test_extensions_and_features_depend_on_core_and_companion(self):
        expected = (self.by_key['core'], self.by_key['companion'])

        for key in EXTENSIONS + FEATURES:
            self.assertEqual(self.by_key[key].depends, expected)

    def test_no_file_ships_twice(self):
        paths = every_path(self.packages)

        self.assertEqual(len(paths), len(set(paths)))

    def test_core_ships_the_root_namespace_registry_and_vendored_libraries(self):
        core = self.paths('core')

        self.assertIn(MODS + 'otmetki/__init__.py', core)
        self.assertIn(MODS + 'otmetki/core/registry/__init__.py', core)
        self.assertIn(MODS + 'otmetki/features/__init__.py', core)
        self.assertIn(MODS + 'otmetki/core/vendor/six.py', core)
        self.assertIn(MODS + 'otmetki/core/vendor/blinker/base.py', core)
        self.assertIn(MODS + 'otmetki/core/vendor/attr/_make.py', core)
        self.assertIn(MODS + 'otmetki/core/vendor/enum34/__init__.py', core)
        self.assertIn(MODS + 'otmetki/core/vendor/licenses/six.txt', core)
        self.assertNotIn(MODS + 'otmetki/core/vendor/attr/_next_gen.py', core)

    def test_companion_ships_its_entry_script_and_app(self):
        companion = self.paths('companion')

        self.assertIn(MODS + 'mod_otmetki.py', companion)
        self.assertIn(MODS + 'otmetki/companion/app/client/__init__.py', companion)

    def test_a_feature_ships_its_entry_script_and_model(self):
        replay = self.paths('replay_upload')

        self.assertIn(MODS + 'mod_otmetki_replay_upload.py', replay)
        self.assertIn(MODS + 'otmetki/features/replay_upload/model/__init__.py', replay)

    def test_tests_and_entry_folders_never_ship(self):
        shipped = [path for path in every_path(self.packages) if '/tests/' in path or '/entry/' in path]

        self.assertEqual(shipped, [])

    def test_entry_scripts_land_right_in_gui_mods(self):
        every = every_path(self.packages)

        entries = [path for path in every if path.startswith(MODS) and '/' not in path[len(MODS):]]

        expected = [MODS + 'mod_otmetki.py'] + [MODS + 'mod_otmetki_%s.py' % key for key in EXTENSIONS + FEATURES]
        self.assertEqual(sorted(entries), sorted(expected))

    def test_ui_ships_its_gameface_page_and_res_map(self):
        ui = self.paths('ui')

        self.assertIn(MODS + 'mod_otmetki_ui.py', ui)
        self.assertIn(MODS + 'otmetki/ui/bridge/bridge.py', ui)
        for name in ('index.html', 'hud.html', 'icon.png'):
            self.assertIn(UI_ASSETS + name, ui)
        self.assertIn(layout.RES_MAP_ROOT + '/net.triotmetki.ui.json', ui)

    def test_only_the_ui_ships_gameface_and_res_map_files(self):
        roots = (layout.GAMEFACE_ROOT, layout.RES_MAP_ROOT)

        gameface = [path for path in every_path(self.packages) if path.startswith(roots)]

        ui_assets = [path for path in self.paths('ui') if not path.endswith('.py')]
        self.assertEqual(gameface, ui_assets)

    def test_single_package_is_the_union_under_the_companion_id(self):
        single = layout.single_package('root_init.py')

        self.assertEqual(single.package_id, 'otmetki.companion')
        self.assertEqual(single.depends, ())
        self.assertEqual(sorted(path for _, path in single.files), sorted(every_path(self.packages)))

    def test_meta_xml_names_the_package_and_its_dependencies(self):
        meta = archive.meta_xml(self.by_key['marks_panel'])

        self.assertIn('<id>net.triotmetki.marks_panel</id>', meta)
        self.assertIn('<dependency>\n            <id>net.triotmetki.core</id>', meta)
        self.assertIn('<id>otmetki.companion</id>', meta)

    def test_meta_xml_of_core_has_no_dependencies(self):
        meta = archive.meta_xml(self.by_key['core'])

        self.assertNotIn('<dependencies>', meta)

    def test_file_name_is_id_and_version_with_the_platform_extension(self):
        companion = self.by_key['companion']

        name = archive.file_name(companion, 'lesta')

        self.assertEqual(name, 'otmetki.companion_%s.mtmod' % companion.version)

    def test_single_file_name_is_the_bare_version(self):
        companion = self.by_key['companion']

        name = archive.file_name(companion, 'wg', single=True)

        self.assertEqual(name, 'otmetki.%s.wotmod' % companion.version)


class BuildTest(unittest.TestCase):

    def setUp(self):
        self.out = tempfile.mkdtemp()
        self.saved = build.compilers.select
        self.use_compiler(NO_COMPILER)

    def tearDown(self):
        build.compilers.select = self.saved
        shutil.rmtree(self.out)

    def use_compiler(self, selection):
        build.compilers.select = lambda choice, owg=None, python27=None: selection

    def run_build(self, *extra):
        with contextlib2.redirect_stdout(StringIO()):
            return build.build(build.parse_args(['--out', self.out] + list(extra)))

    def test_split_build_writes_one_mtmod_per_package(self):
        outputs = self.run_build()

        self.assertEqual(len(outputs), 2 + len(EXTENSIONS) + len(FEATURES))
        self.assertEqual([path for path in outputs if not path.endswith('.mtmod')], [])

    def test_a_package_starts_with_meta_xml_and_lists_its_directories(self):
        outputs = self.run_build()

        names = zip_names(package_output(outputs, 'otmetki.companion_'))

        self.assertEqual(names[0], 'meta.xml')
        self.assertIn('res/scripts/client/gui/mods/', names)
        self.assertIn(MODS + 'mod_otmetki.py', names)

    def test_a_package_is_stored_uncompressed_with_its_meta(self):
        outputs = self.run_build()

        with zipfile.ZipFile(package_output(outputs, 'otmetki.companion_')) as package:
            compressions = set(info.compress_type for info in package.infolist())
            meta = package.read('meta.xml')

        self.assertEqual(compressions, {zipfile.ZIP_STORED})
        self.assertIn(b'<id>net.triotmetki.core</id>', meta)

    def test_single_build_writes_one_package_into_the_single_folder(self):
        outputs = self.run_build('--single', '--wg')

        self.assertEqual([os.path.basename(path) for path in outputs], ['otmetki.%s.wotmod' % layout.modpack_version()])
        self.assertEqual(os.path.dirname(outputs[0]), os.path.join(self.out, build.SINGLE_DIR))

    def test_single_package_carries_core_and_feature_sources(self):
        outputs = self.run_build('--single', '--wg')

        names = zip_names(outputs[0])

        self.assertIn(MODS + 'otmetki/core/registry/__init__.py', names)
        self.assertIn(MODS + 'otmetki/features/session_stats/client/__init__.py', names)

    def test_split_build_leaves_the_single_package_out_of_its_folder(self):
        single = self.run_build('--single', '--wg')[0]

        self.run_build()

        self.assertNotIn(os.path.basename(single), os.listdir(self.out))

    def test_require_pyc_fails_without_a_compiler(self):
        with self.assertRaises(SystemExit):
            self.run_build('--require-pyc')

    def test_only_sources_are_compiled(self):
        compiled = []

        def compile_entries(entries, staging):
            compiled.extend(archive_path for _, archive_path in entries)
            return [(source, archive_path + 'c') for source, archive_path in entries]

        self.use_compiler(('fake', compile_entries))

        outputs = self.run_build()

        self.assertTrue(compiled)
        self.assertEqual([path for path in compiled if not path.endswith('.py')], [])
        names = zip_names(package_output(outputs, 'net.triotmetki.ui_'))
        self.assertIn(UI_ASSETS + 'index.html', names)
        self.assertIn(layout.RES_MAP_ROOT + '/net.triotmetki.ui.json', names)
        self.assertIn(MODS + 'mod_otmetki_ui.pyc', names)

    def test_dry_run_lists_the_paths_and_writes_nothing(self):
        dry_out = os.path.join(self.out, 'dry')
        output = StringIO()

        with contextlib2.redirect_stdout(output):
            result = build.build(build.parse_args(['--out', dry_out, '--dry-run']))

        self.assertEqual(result, [])
        self.assertFalse(os.path.exists(dry_out))
        self.assertIn(UI_ASSETS + 'index.html', output.getvalue())


class Py27CompileTest(unittest.TestCase):

    def compiled(self, folder, mtime):
        source = os.path.join(folder, 'mod.py')
        with open(source, 'w') as handle:
            handle.write('VALUE = 1\n')
        os.utime(source, (mtime, mtime))
        staging = os.path.join(folder, 'out%d' % mtime)
        [(target, _)] = compilers.compile_py27([sys.executable], [(source, 'mod.py')], staging)
        with open(target, 'rb') as handle:
            return handle.read()

    def test_the_bytecode_does_not_depend_on_the_source_mtime(self):
        folder = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, folder, True)

        with contextlib2.redirect_stdout(StringIO()):
            first = self.compiled(folder, 1000000000)
            second = self.compiled(folder, 1200000000)

        self.assertEqual(first, second)


if __name__ == '__main__':
    unittest.main()
