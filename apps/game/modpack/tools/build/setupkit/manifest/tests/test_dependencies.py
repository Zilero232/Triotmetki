from __future__ import absolute_import, division, print_function, unicode_literals

import copy
import io
import os
import re
import sys
import unittest

BUILD_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if BUILD_DIR not in sys.path:
    sys.path.insert(0, BUILD_DIR)

import fileio  # noqa: E402
import layout  # noqa: E402
from setupkit import ASSETS_DIR, CATALOG_PATH  # noqa: E402
from setupkit.manifest import catalog as catalog_module  # noqa: E402
from setupkit.manifest.generate import ManifestError, build_manifest  # noqa: E402

GAMEFACE = 'openwg_gameface'
MODS_LIST = 'modslist'
# The renderer lives in core (core/client/hud: OpenWG Gameface); its users are the packages below.
RENDERER_HOST = 'core'
HUD_USE = re.compile(r'\bBattlePanel\b|\bHangarLabel\b|\bPolledHangarCard\b|\bhud_layer\(|\.ui\.show\(')
GAMEFACE_IMPORT = re.compile(r'^\s*(?:from\s+openwg_gameface\s+import|import\s+openwg_gameface)\b', re.MULTILINE)
# What reaches Gameface through core without a panel: a stock view's injected page (core/client/hud/gameface/inject),
# the renderer itself and a screen loaded as a lobby sub view (core/client/sub_view).
GAMEFACE_USE = re.compile(r'\bcan_inject\(|\bmod_inject\(|\bcreate_backend\(|\bSubViewHost\(')
SUB_VIEW_USE = re.compile(r'\bSubViewHost\(')
MODS_LIST_IMPORT = re.compile(r'^\s*from\s+gui\.modsListApi\s+import\b', re.MULTILINE)
SKIPPED_DIRS = ('tests', '__pycache__')
REVIEWED_PINS = {
    GAMEFACE: (
        'net.openwg.gameface_1.2.2.mtmod',
        '2bb65f28663e3ab34b5a1102a1bbd1f6e17a65e1f6a898a8645c4ab732b50184',
        48445,
        'MIT',
    ),
    MODS_LIST: (
        'me.poliroid.modslistapi_1.6.01.mtmod',
        'b312adfcd005405d49b711e79b4032be7d624b6e38d4156364d1c04bc5dba71f',
        79776,
        'MIT',
    ),
}


def load_catalog():
    return catalog_module.load(CATALOG_PATH, ASSETS_DIR)


def package_dir(key):
    feature = os.path.join(layout.FEATURES_DIR, key)
    return feature if os.path.isdir(feature) else os.path.join(layout.PACKAGES_DIR, key)


def source_paths(key):
    for folder, dirs, files in os.walk(package_dir(key)):
        dirs[:] = [name for name in dirs if name not in SKIPPED_DIRS]
        for name in files:
            if name.endswith('.py'):
                yield os.path.join(folder, name)


def sources(key):
    for path in source_paths(key):
        with io.open(path, encoding='utf-8') as handle:
            yield handle.read()


def keys_using(pattern):
    keys = [package.key for package in layout.split_packages('root_init.py') if package.key != RENDERER_HOST]
    return set(key for key in keys if any(pattern.search(text) for text in sources(key)))


def packages_named(*keys):
    return [package for package in layout.split_packages('root_init.py') if package.key in keys]


def update(**fields):
    return lambda entry: entry.update(fields)


def update_licence(**fields):
    return lambda entry: entry['licence'].update(fields)


def drop(field):
    return lambda entry: entry.pop(field)


def drop_licence(field):
    return lambda entry: entry['licence'].pop(field)


def require_also(component_id):
    return lambda entry: entry['requiredBy'].append(component_id)


SCHEMA_PROBLEMS = (
    ("/sha256: 'abc' does not match", update(sha256='abc')),
    ('/size: 0 is less than the minimum of 1', update(size=0)),
    ("/sourceUrl: 'http://example.com/x.mtmod' does not match", update(sourceUrl='http://example.com/x.mtmod')),
    ("/licence: 'sha256' is a required property", drop_licence('sha256')),
    ("/licence/name: '' does not match", update_licence(name='')),
    ("/licence/url: 'LICENSE' does not match", update_licence(url='LICENSE')),
    ("'author' is a required property", drop('author')),
    ("('category' was unexpected)", update(category='battle')),
    ('/requiredBy: []', update(requiredBy=[])),
    ('has non-unique elements', require_also('ui')),
    ("'restartRequired' is a required property", drop('restartRequired')),
    ("/optional: 'yes' is not of type 'boolean'", update(optional='yes')),
    ("/kind: 'dependency' was expected", update(kind='library')),
    ("/version: '1.x' does not match", update(version='1.x')),
    ("/packageId: 'modslist' does not match", update(packageId='modslist')),
)
CHECK_PROBLEMS = (
    ('is ours', update(packageId='net.triotmetki.modslistapi', file='net.triotmetki.modslistapi_1.6.01.mtmod')),
    ('matches ownedPatterns', update(packageId='otmetki.modslistapi', file='otmetki.modslistapi_1.6.01.mtmod')),
    ('file must be me.poliroid.modslistapi_1.6.01.mtmod', update(file='modslist.mtmod')),
    ('file must be', update(version='1.6.02')),
    ("unknown component 'nothing'", require_also('nothing')),
    ("unknown component 'modslist'", require_also('modslist')),
    ('duplicate id', update(id='marks_panel')),
)


class RequiredByFollowsTheCodeTest(unittest.TestCase):

    def setUp(self):
        self.catalog = load_catalog()
        self.by_id = {dependency.id: dependency for dependency in self.catalog.dependencies}
        self.order = [entry.id for entry in self.catalog.components]

    def assert_required_by(self, dependency_id, expected):
        required_by = self.by_id[dependency_id].required_by
        self.assertEqual(set(required_by), expected, 'update requiredBy of %s in catalog/catalog.json' % dependency_id)
        in_catalog_order = sorted(required_by, key=self.order.index)
        self.assertEqual(list(required_by), in_catalog_order, 'keep requiredBy in catalog order')

    def test_hud_and_hangar_labels_need_gameface(self):
        labels = keys_using(HUD_USE)

        self.assertIn('marks_panel', labels)
        self.assertIn('session_stats', labels)
        self.assertTrue(labels.issubset(self.by_id[GAMEFACE].required_by))

    def test_only_the_ui_opens_a_gameface_window_of_its_own(self):
        window = keys_using(GAMEFACE_IMPORT)

        self.assertEqual(window, {'ui'})

    def test_the_hit_viewer_is_a_core_sub_view(self):
        screens = keys_using(SUB_VIEW_USE)

        self.assertEqual(screens, {'hit_viewer'})

    def test_gameface_window_and_labels_need_gameface(self):
        users = keys_using(GAMEFACE_IMPORT) | keys_using(HUD_USE) | keys_using(GAMEFACE_USE)

        self.assertIn('preset_advisor', users)

        self.assert_required_by(GAMEFACE, users)

    def test_mods_list_is_required_by_what_imports_it(self):
        users = keys_using(MODS_LIST_IMPORT)

        self.assert_required_by(MODS_LIST, users)

    def test_no_dependency_is_optional(self):
        optional = [dependency.id for dependency in self.catalog.dependencies if dependency.optional]

        self.assertEqual(optional, [])

    def test_pins_the_reviewed_releases(self):
        pins = {
            dependency.id: (dependency.file, dependency.sha256, dependency.size, dependency.licence.name)
            for dependency in self.catalog.dependencies
        }

        self.assertEqual(pins, REVIEWED_PINS)

    def test_only_gameface_needs_a_restart(self):
        self.assertTrue(self.by_id[GAMEFACE].restart_required)
        self.assertFalse(self.by_id[MODS_LIST].restart_required)


class DependencyCatalogTest(unittest.TestCase):

    def problems(self, mutate, dependency_id=MODS_LIST):
        raw = copy.deepcopy(fileio.read_json(CATALOG_PATH))
        mutate(next(entry for entry in raw['components'] if entry['id'] == dependency_id))
        with self.assertRaises(catalog_module.CatalogError) as context:
            catalog_module.parse(raw, ASSETS_DIR)
        return '\n'.join(context.exception.problems)

    def test_dependencies_are_listed_apart_from_catalogue_entries(self):
        catalog = load_catalog()

        self.assertEqual([dependency.id for dependency in catalog.dependencies], [GAMEFACE, MODS_LIST])
        self.assertIsNone(catalog.entry(GAMEFACE))

    def assert_problems(self, cases):
        for expected, mutate in cases:
            problems = self.problems(mutate)

            self.assertIn(expected, problems)

    @unittest.skipUnless(catalog_module.HAVE_SCHEMA, 'jsonschema is not installed (tools/requirements.txt)')
    def test_a_badly_shaped_dependency_is_rejected_at_its_schema_path(self):
        self.assert_problems(SCHEMA_PROBLEMS)

    def test_a_bad_dependency_is_rejected_with_the_problem_named(self):
        self.assert_problems(CHECK_PROBLEMS)


class DependencyManifestTest(unittest.TestCase):

    def setUp(self):
        self.catalog = load_catalog()
        raw_components = fileio.read_json(CATALOG_PATH)['components']
        self.raw = {entry['id']: entry for entry in raw_components if entry.get('kind') == 'dependency'}

    def test_passes_the_entries_through_as_the_catalog_pins_them(self):
        manifest, warnings = build_manifest(layout.split_packages('root_init.py'), self.catalog, strict=True)

        data = manifest.to_json()

        entries = [entry for entry in data['components'] if entry.get('kind') == 'dependency']
        ours = data['components'][:len(manifest.components)]
        self.assertEqual(entries, [self.raw[GAMEFACE], self.raw[MODS_LIST]])
        self.assertEqual([entry for entry in ours if 'kind' in entry], [])
        self.assertNotIn('dependencies', data)
        self.assertEqual(warnings, [])

    def test_required_by_keeps_only_the_components_a_build_ships(self):
        packages = packages_named('core', 'companion', 'ui', 'sixth_sense')

        manifest, _ = build_manifest(packages, self.catalog)

        required_by = {dependency.id: dependency.required_by for dependency in manifest.dependencies}
        self.assertEqual(required_by, {GAMEFACE: ('ui', 'sixth_sense'), MODS_LIST: ('ui',)})
        self.assertEqual(manifest.dependencies_of('sixth_sense'), manifest.dependencies[:1])

    def test_a_left_out_user_of_a_dependency_is_a_warning(self):
        packages = packages_named('core', 'companion', 'ui', 'sixth_sense')

        _, warnings = build_manifest(packages, self.catalog)

        expected = 'dependency openwg_gameface is required by marks_panel'
        self.assertTrue([warning for warning in warnings if expected in warning])

    def test_strict_turns_a_left_out_user_into_an_error(self):
        packages = packages_named('core', 'companion', 'ui', 'sixth_sense')

        with self.assertRaises(ManifestError):
            build_manifest(packages, self.catalog, strict=True)

    def test_drops_a_dependency_nothing_in_the_build_needs(self):
        packages = packages_named('core', 'companion', 'ui')

        manifest, _ = build_manifest(packages, self.catalog)

        self.assertEqual([dependency.id for dependency in manifest.dependencies], [GAMEFACE, MODS_LIST])


if __name__ == '__main__':
    unittest.main()
