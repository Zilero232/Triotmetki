import os
import sys
import unittest
from types import SimpleNamespace

TOOLS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

import dev  # noqa: E402,F401
import layout  # noqa: E402
from dev import selection  # noqa: E402


def package(key, depends=()):
    return layout.Package(key, 'net.triotmetki.' + key, key, '0.1.0', key, [], depends)


def entry(key, required=False, dependencies=()):
    return SimpleNamespace(id=key, required=required, dependencies=tuple(dependencies))


def dependency(key, required_by, optional=False):
    return SimpleNamespace(id=key, required_by=tuple(required_by), optional=optional)


class FakeCatalog(object):

    def __init__(self, components, dependencies=()):
        self.components = tuple(components)
        self.dependencies = tuple(dependencies)

    def entry(self, key):
        return next((item for item in self.components if item.id == key), None)


CORE = package('core')
COMPANION = package('companion', [CORE])
PACKAGES = [
    CORE,
    COMPANION,
    package('ui', [CORE, COMPANION]),
    package('marks_panel', [CORE, COMPANION]),
    package('damage_log', [CORE, COMPANION]),
    package('hit_viewer', [CORE, COMPANION]),
]
CATALOG = FakeCatalog(
    [entry('core', True), entry('companion', True), entry('ui', True), entry('marks_panel'), entry('damage_log'),
     entry('hit_viewer', dependencies=['damage_log'])],
    [dependency('openwg_gameface', ['ui', 'marks_panel']), dependency('guiflash', ['marks_panel']),
     dependency('modslist', ['ui'], optional=True)],
)


class SelectTest(unittest.TestCase):

    def test_no_ids_selects_every_package(self):
        chosen = selection.select(PACKAGES, CATALOG)

        self.assertEqual(chosen.keys, tuple(item.key for item in PACKAGES))

    def test_an_id_brings_its_package_dependencies_and_the_required_entries(self):
        chosen = selection.select(PACKAGES, CATALOG, ['marks_panel'])

        self.assertEqual(chosen.keys, ('core', 'companion', 'ui', 'marks_panel'))

    def test_an_id_brings_its_catalog_dependencies(self):
        chosen = selection.select(PACKAGES, CATALOG, ['hit_viewer'])

        self.assertIn('damage_log', chosen.keys)

    def test_third_party_mods_join_for_the_components_that_need_them(self):
        chosen = selection.select(PACKAGES, CATALOG, ['marks_panel'])

        self.assertEqual([item.id for item in chosen.dependencies], ['openwg_gameface', 'guiflash'])

    def test_an_optional_third_party_mod_never_joins(self):
        chosen = selection.select(PACKAGES, CATALOG)

        self.assertNotIn('modslist', [item.id for item in chosen.dependencies])

    def test_an_unknown_id_is_an_error(self):
        with self.assertRaises(selection.SelectionError):
            selection.select(PACKAGES, CATALOG, ['no_such_component'])


if __name__ == '__main__':
    unittest.main()
