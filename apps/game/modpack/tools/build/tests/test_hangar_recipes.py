# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import base64
import copy
import io
import json
import os
import struct
import sys
import unittest

import _support

BUILD_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS_DIR = os.path.dirname(BUILD_DIR)
for path in (BUILD_DIR, os.path.join(TOOLS_DIR, 'assets')):
    if path not in sys.path:
        sys.path.insert(0, path)

import hangars  # noqa: E402
import lut  # noqa: E402
import packed_xml  # noqa: E402
from otmetki.features.hangar_space.model import GENERATED_PREFIX, NAMED_GENERATED_LOOKS  # noqa: E402

CATALOG = os.path.join(_support.MODPACK_DIR, 'catalog', 'catalog.json')
LOOK_IDS = ['night', 'steel', 'studio', 'sunset']
COLOUR_MAP = 'HDR/colorCorrection/map'
OUR_TABLE = 'system/maps/post_processing/cube/otmetki/%s.dds'
IDENTITY = {
    'white_balance': [1, 1, 1], 'gain': [1, 1, 1], 'lift': [0, 0, 0], 'gamma': [1, 1, 1], 'saturation': 1,
    'shadows': [0, 0, 0], 'highlights': [0, 0, 0], 'contrast': 1,
}
TABLE_SIZE = 16512
HEADER_SIZE = 128


def index():
    return hangars.load_client_index(hangars.package_info()['client'])


def recipe(look_id):
    return copy.deepcopy([item for item in hangars.load_recipes() if item['id'] == look_id][0])


def problems_of(changed):
    return hangars.recipe_problems(changed, index())


def pixel(data, x, y):
    offset = HEADER_SIZE + (y * lut.WIDTH + x) * 4
    return tuple(bytearray(data[offset:offset + 4]))


def packed(names, root):
    return struct.pack(str('<IB'), packed_xml.MAGIC, 0) + b''.join(name + b'\0' for name in names) + b'\0' + root


def element(own, children):
    """own: (type, bytes); children: [(name index, type, bytes)] with element children as already packed bytes."""
    descriptors = []
    end = len(own[1])
    for index, kind, data in children:
        end += len(data)
        descriptors.append(struct.pack(str('<HI'), index, kind << packed_xml.TYPE_SHIFT | end))
    head = struct.pack(str('<HI'), len(children), own[0] << packed_xml.TYPE_SHIFT | len(own[1]))
    return head + b''.join(descriptors) + own[1] + b''.join(data for _, _, data in children)


class RecipesTest(unittest.TestCase):

    def test_there_are_the_four_looks(self):
        self.assertEqual(hangars.recipe_ids(), LOOK_IDS)

    def test_every_recipe_fits_the_indexed_client(self):
        found = hangars.problems(hangars.load_recipes(), index())

        self.assertEqual(found, [])

    def test_the_bundle_is_current(self):
        self.assertFalse(hangars.is_stale())

    def test_the_bundle_carries_every_recipe_once(self):
        with io.open(hangars.BUNDLE, encoding='utf-8') as handle:
            bundled = json.load(handle)

        self.assertEqual(bundled['schemaVersion'], 1)
        self.assertEqual([look['id'] for look in bundled['looks']], LOOK_IDS)

    def test_every_look_uses_its_own_colour_table(self):
        for look_id in LOOK_IDS:
            values = {item['path']: item['value'] for item in recipe(look_id)['set']}

            self.assertEqual(values[COLOUR_MAP], OUR_TABLE % look_id)

    def test_every_look_has_a_name_in_the_hangar_switcher(self):
        for look_id in LOOK_IDS:
            self.assertIn(GENERATED_PREFIX + look_id, NAMED_GENERATED_LOOKS)

    def test_the_environment_name_carries_the_generated_prefix(self):
        self.assertEqual(hangars.environment_name(recipe('night')), 'otm_night')

    def test_the_kill_switch_names_only_known_looks(self):
        with io.open(CATALOG, encoding='utf-8') as handle:
            disabled = json.load(handle)['disabledLooks']

        self.assertEqual([look_id for look_id in disabled if look_id not in LOOK_IDS], [])


class RecipeProblemsTest(unittest.TestCase):

    def test_an_unknown_parameter_is_refused(self):
        changed = recipe('night')
        changed['set'].append({'path': 'HDR/bloom/sparkle', 'value': 1})

        found = problems_of(changed)

        self.assertEqual(len(found), 1)
        self.assertIn('HDR/bloom/sparkle', found[0])

    def test_a_value_of_the_wrong_type_is_refused(self):
        changed = recipe('night')
        changed['set'] = [{'path': 'day_night_cycle/sunColor', 'value': [1, 2]}]

        found = problems_of(changed)

        self.assertEqual(len(found), 1)
        self.assertIn('floats:3', found[0])

    def test_a_texture_the_client_lacks_is_refused(self):
        changed = recipe('sunset')
        changed['sky'] = {'deferred': 'maps/skyboxes/nowhere.dds'}

        found = problems_of(changed)

        self.assertEqual(len(found), 1)
        self.assertIn('nowhere.dds', found[0])

    def test_a_colour_table_we_do_not_build_is_refused(self):
        changed = recipe('studio')
        changed['set'] = [{'path': COLOUR_MAP, 'value': OUR_TABLE % 'ghost'}]

        found = problems_of(changed)

        self.assertEqual(len(found), 1)
        self.assertIn('ghost', found[0])

    def test_a_look_not_checked_on_the_client_is_refused(self):
        changed = recipe('steel')
        changed['clients'] = ['1.44.0.0']

        found = problems_of(changed)

        self.assertEqual(len(found), 1)
        self.assertIn('not checked', found[0])

    def test_a_missing_base_environment_is_refused(self):
        changed = recipe('steel')
        changed['base']['environment'] = 'Gone'

        found = problems_of(changed)

        self.assertEqual(len(found), 1)
        self.assertIn('Gone', found[0])

    def test_a_repeated_parameter_is_refused(self):
        changed = recipe('studio')
        changed['set'].append(changed['set'][0])

        found = problems_of(changed)

        self.assertEqual(len(found), 1)
        self.assertIn('duplicate', found[0])


@unittest.skipIf(hangars.jsonschema is None, 'jsonschema is not installed')
class RecipeSchemaTest(unittest.TestCase):

    def test_every_recipe_matches_the_schema(self):
        for item in hangars.load_recipes():
            self.assertEqual(hangars.schema_problems(item), [])

    def test_a_block_outside_the_allow_list_is_refused(self):
        changed = recipe('night')
        changed['set'] = [{'path': 'VFX/particlesSpaceConfigXml', 'value': 'spaces/01_karelia/particles.xml'}]

        self.assertTrue(hangars.schema_problems(changed))

    def test_the_environment_name_cannot_be_set(self):
        changed = recipe('night')
        changed['set'] = [{'path': 'HDR/tonemappings/tonemapping[0]/name', 'value': 1}]

        self.assertTrue(hangars.schema_problems(changed))

    def test_a_path_out_of_the_client_folders_is_refused(self):
        changed = recipe('night')
        changed['sky'] = {'deferred': '../../bin/evil.dds'}

        self.assertTrue(hangars.schema_problems(changed))

    def test_an_unknown_field_is_refused(self):
        changed = recipe('night')
        changed['space_settings'] = {'bounds': 1}

        self.assertTrue(hangars.schema_problems(changed))


class ColourTableTest(unittest.TestCase):

    def test_every_table_matches_its_grade(self):
        for look_id, grade in sorted(lut.load_grades().items()):
            with open(lut.output_path(look_id), 'rb') as handle:
                shipped = bytearray(handle.read())
            expected = bytearray(lut.table(grade))

            self.assertEqual(shipped[:HEADER_SIZE], expected[:HEADER_SIZE])
            self.assertLessEqual(max(abs(left - right) for left, right in zip(shipped, expected)), 1)

    def test_every_look_has_a_grade(self):
        self.assertEqual(sorted(lut.load_grades()), LOOK_IDS)

    def test_a_table_has_the_size_of_the_client_tables(self):
        self.assertEqual(len(lut.table(IDENTITY)), TABLE_SIZE)

    def test_red_runs_along_a_slice_green_down_and_blue_across_slices(self):
        data = lut.table(IDENTITY)

        self.assertEqual(pixel(data, 15, 0), (0, 0, 255, 255))
        self.assertEqual(pixel(data, 0, 15), (0, 255, 0, 255))
        self.assertEqual(pixel(data, 240, 0), (255, 0, 0, 255))
        self.assertEqual(pixel(data, 255, 15), (255, 255, 255, 255))


class PackedXmlTest(unittest.TestCase):

    def test_a_document_reads_back_with_its_types(self):
        sun = element((packed_xml.STRING, b''), [(2, packed_xml.FLOATS, struct.pack(str('<3f'), 1, 0.5, 0.25))])
        root = element((packed_xml.STRING, b''), [
            (0, packed_xml.STRING, b'otm_night'),
            (1, packed_xml.ELEMENT, sun),
            (3, packed_xml.BOOL, b'\x01'),
            (4, packed_xml.INT, struct.pack(str('<h'), 300)),
            (5, packed_xml.BLOB, base64.b64decode(b'FilmicTM')),
        ])
        names = [b'name', b'day_night_cycle', b'sunColor', b'isMoon', b'active', b'tone']

        node = packed_xml.decode(packed(names, root))

        self.assertEqual(node.child('name').value, 'otm_night')
        self.assertEqual(node.child('day_night_cycle').child('sunColor').value, [1.0, 0.5, 0.25])
        self.assertTrue(node.child('isMoon').value)
        self.assertEqual(node.child('active').value, 300)
        self.assertEqual(node.child('tone').value, 'FilmicTM')

    def test_an_element_keeps_its_own_value_and_children(self):
        texture = element((packed_xml.STRING, b'diffuseMap'), [(1, packed_xml.STRING, b'maps/sky.dds')])
        root = element((packed_xml.STRING, b''), [(0, packed_xml.ELEMENT, texture)])

        node = packed_xml.decode(packed([b'property', b'Texture'], root)).child('property')

        self.assertEqual(node.value, 'diffuseMap')
        self.assertEqual(node.child('Texture').value, 'maps/sky.dds')

    def test_repeated_siblings_are_addressed_by_index(self):
        first = element((packed_xml.STRING, b''), [(1, packed_xml.FLOATS, struct.pack(str('<f'), 0.19))])
        second = element((packed_xml.STRING, b''), [(1, packed_xml.FLOATS, struct.pack(str('<f'), 0.31))])
        tonemaps = element((packed_xml.STRING, b''), [(0, packed_xml.ELEMENT, first), (0, packed_xml.ELEMENT, second)])
        root = element((packed_xml.STRING, b''), [(2, packed_xml.ELEMENT, tonemaps)])

        node = packed_xml.decode(packed([b'tonemapping', b'middleGray', b'tonemappings'], root))

        self.assertEqual(
            [path for path, _ in packed_xml.leaves(node)],
            ['tonemappings/tonemapping[0]/middleGray', 'tonemappings/tonemapping[1]/middleGray'],
        )

    def test_a_text_file_is_not_packed(self):
        self.assertFalse(packed_xml.is_packed(b'<root></root>'))

    def test_decoding_a_text_file_fails(self):
        with self.assertRaises(packed_xml.PackedXmlError):
            packed_xml.decode(b'<root></root>')


if __name__ == '__main__':
    unittest.main()
