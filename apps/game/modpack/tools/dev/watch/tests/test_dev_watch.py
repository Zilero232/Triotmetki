from __future__ import absolute_import, division, print_function, unicode_literals

import os
import sys
import types
import unittest

import mock

TOOLS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

import dev  # noqa: E402,F401
import layout  # noqa: E402
from dev import watch  # noqa: E402

PACKAGES = layout.split_packages('root_init.py')
FEATURE = 'marks_panel'


def source(*parts):
    return os.path.join(layout.MODPACK_DIR, *parts)


class PackagesForTest(unittest.TestCase):

    def test_a_feature_module_rebuilds_that_feature(self):
        self.assertEqual(watch.packages_for(source('features', FEATURE, 'model', 'x.py'), PACKAGES), {FEATURE})

    def test_a_new_module_counts_before_any_build_has_seen_it(self):
        path = source('features', FEATURE, 'model', 'not_written_yet.py')

        self.assertEqual(watch.packages_for(path, PACKAGES), {FEATURE})

    def test_a_core_module_rebuilds_the_core(self):
        self.assertEqual(watch.packages_for(source('packages', 'core', 'log', '__init__.py'), PACKAGES), {'core'})

    def test_the_built_ui_bundle_rebuilds_the_ui_package(self):
        path = source('packages', 'ui', 'gameface', 'index.html')

        self.assertEqual(watch.packages_for(path, PACKAGES), {'ui'})

    def test_the_shared_features_init_belongs_to_the_core(self):
        self.assertEqual(watch.packages_for(source('features', '__init__.py'), PACKAGES), {'core'})

    def test_tests_and_bytecode_rebuild_nothing(self):
        self.assertEqual(watch.packages_for(source('features', FEATURE, 'tests', 'test_x.py'), PACKAGES), set())
        self.assertEqual(watch.packages_for(source('packages', 'core', 'log', '__init__.pyc'), PACKAGES), set())

    def test_a_path_outside_the_sources_rebuilds_nothing(self):
        self.assertEqual(watch.packages_for(source('ui-web', 'src', 'main.tsx'), PACKAGES), set())


class IsIgnoredTest(unittest.TestCase):

    def test_a_folder_named_like_an_ignored_one_above_the_repo_ignores_nothing(self):
        root = os.path.join(os.sep, 'tests', 'repo')

        self.assertFalse(watch.is_ignored(os.path.join(root, 'packages', 'core', 'x.py'), root))

    def test_a_tests_folder_inside_the_repo_is_ignored(self):
        root = os.path.join(os.sep, 'repo')

        self.assertTrue(watch.is_ignored(os.path.join(root, 'packages', 'core', 'tests', 'x.py'), root))


class _Observer(object):

    def schedule(self, *args, **kwargs):
        pass

    def start(self):
        pass

    def stop(self):
        pass

    def join(self):
        pass


class RunTest(unittest.TestCase):

    def run_rounds(self, layouts):
        rounds = [{source('features', FEATURE, 'model', 'x.py')} for _ in layouts]
        drains = iter(rounds)

        def drain(events, timeout):
            try:
                return next(drains)
            except StopIteration:
                raise KeyboardInterrupt
        reinstalled = []
        observers = types.ModuleType(str('watchdog.observers'))
        observers.Observer = _Observer
        stubs = {'watchdog': types.ModuleType(str('watchdog')), 'watchdog.observers': observers}
        modules = mock.patch.dict(sys.modules, stubs)
        readings = mock.patch.object(layout, 'split_packages', side_effect=layouts)
        with modules, readings, mock.patch.object(watch, '_drain', drain):
            watch.run([FEATURE], lambda keys: reinstalled.append(keys) or True)
        return reinstalled

    def test_an_unreadable_package_layout_keeps_watching(self):
        reinstalled = self.run_rounds([SystemExit('missing VERSION'), PACKAGES])

        self.assertEqual(reinstalled, [[FEATURE]])

    def test_a_half_written_assets_file_keeps_watching(self):
        reinstalled = self.run_rounds([ValueError('bad json'), PACKAGES])

        self.assertEqual(reinstalled, [[FEATURE]])


if __name__ == '__main__':
    unittest.main()
