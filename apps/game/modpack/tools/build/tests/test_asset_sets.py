# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import os
import sys
import unittest

import _support  # noqa: F401

BUILD_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS_DIR = os.path.dirname(BUILD_DIR)
for path in (BUILD_DIR, os.path.join(TOOLS_DIR, 'assets')):
    if path not in sys.path:
        sys.path.insert(0, path)

import asset_sets  # noqa: E402
import layout  # noqa: E402
import render  # noqa: E402


def listed_files(sets):
    listed = set()
    for asset_set in sets:
        directory = asset_set.path(asset_set.files)
        listed.update(os.path.normcase(os.path.join(directory, name)) for name in asset_set.file_names())
    return listed


def shipped_binary_assets():
    """Every .png/.mp3 under assets/, the source folders (src) left out."""
    for directory, _, files in os.walk(asset_sets.ASSETS_DIR):
        if os.sep + 'src' in directory:
            continue
        for name in files:
            if os.path.splitext(name)[1].lower() in asset_sets.ASSET_EXTENSIONS:
                yield os.path.normcase(os.path.join(directory, name))


def package_paths(key):
    packages = {package.key: package for package in layout.split_packages('root_init.py')}
    return [path for _, path in packages[key].files]


class AssetSetsTest(unittest.TestCase):

    def setUp(self):
        self.sets = asset_sets.load()

    def third_party_set(self):
        return [asset_set for asset_set in self.sets if asset_set.origin == 'third_party'][0]

    def test_the_manifest_has_no_problems(self):
        found = asset_sets.problems(self.sets)

        self.assertEqual(found, [])

    def test_every_set_has_its_licence_file(self):
        for asset_set in self.sets:
            self.assertTrue(os.path.isfile(asset_set.path(asset_set.license_file)), asset_set.id)

    def test_third_party_sets_are_permissive_and_link_their_source(self):
        for asset_set in self.sets:
            if asset_set.origin != 'third_party':
                continue
            self.assertIn(asset_set.license, asset_sets.PERMISSIVE_LICENCES, asset_set.id)
            self.assertTrue(asset_set.url.startswith('https://'), asset_set.id)

    def test_no_binary_asset_outside_a_set(self):
        listed = listed_files(self.sets)

        for path in shipped_binary_assets():
            self.assertIn(path, listed)

    def test_problems_catch_a_non_commercial_licence(self):
        non_commercial = dict(self.third_party_set().data, id='nc', license='CC-BY-NC-4.0')

        found = asset_sets.problems([asset_sets.AssetSet(non_commercial)])

        self.assertTrue([problem for problem in found if 'not allowed' in problem])

    def test_problems_refuse_the_original_licence_on_a_third_party_set(self):
        own = dict(self.third_party_set().data, id='own', license=asset_sets.ORIGINAL_LICENCE)

        found = asset_sets.problems([asset_sets.AssetSet(own)])

        self.assertTrue(found)

    def test_notices_are_current(self):
        status = asset_sets.main([])

        self.assertEqual(status, 0)

    def test_notices_name_every_set_and_the_original_artwork(self):
        with io.open(asset_sets.NOTICES, encoding='utf-8') as handle:
            text = handle.read()

        for asset_set in self.sets:
            self.assertIn(asset_set.title, text)
            self.assertIn(asset_set.license, text)
        self.assertIn('Kenney', text)
        self.assertIn('Original artwork, (c) Три отметки', text)

    def test_every_source_is_rendered(self):
        for asset_set in self.sets:
            for output, _, _ in render.planned(asset_set):
                self.assertTrue(os.path.isfile(output), output)

    def test_build_ships_each_sets_files_licence_and_notices(self):
        for asset_set in self.sets:
            paths = package_paths(asset_set.feature)
            for name in asset_set.file_names():
                self.assertIn('%s/%s' % (asset_set.target, name), paths)
            self.assertIn(asset_set.license_target, paths)
            self.assertIn('%s/%s/%s' % (asset_sets.ICONS_ROOT, asset_set.feature, asset_sets.NOTICES_NAME), paths)

    def test_a_feature_without_sets_ships_only_sources(self):
        assets = [path for path in package_paths('team_hp') if not path.endswith('.py')]

        self.assertEqual(assets, [])

    def test_single_package_ships_the_set_licences(self):
        single = [path for _, path in layout.single_package('root_init.py').files]

        self.assertIn('res/gui/maps/icons/otmetki/crosshair/kenney/License.txt', single)


if __name__ == '__main__':
    unittest.main()
