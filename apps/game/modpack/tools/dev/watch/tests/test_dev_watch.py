import os
import sys
import unittest

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


if __name__ == '__main__':
    unittest.main()
