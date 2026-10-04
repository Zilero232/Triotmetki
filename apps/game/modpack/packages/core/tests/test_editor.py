from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.editor import editor_spec, sample

WIDGET = {'kind': 'card', 'v': 1, 'data': {}}


def translate(key, **params):
    return key.upper()


class EditorSpecTest(unittest.TestCase):

    def test_groups_are_labelled_by_the_feature(self):
        spec = editor_spec('team_hp', (('look', ('style',)),), translate)

        self.assertEqual(spec['groups'], [{'id': 'look', 'label': 'TEAM_HP_GROUP_LOOK', 'keys': ['style']}])
        self.assertEqual((spec['icons'], spec['swatches']), ({}, {}))

    def test_samples_without_a_widget_are_left_out(self):
        samples = (sample('hangar_info', 'strip', WIDGET, translate), sample('hangar_info', 'none', None, translate))

        spec = editor_spec('hangar_info', (), translate, samples=samples)

        self.assertEqual(spec['samples'], [{'id': 'strip', 'label': 'HANGAR_INFO_SAMPLE_STRIP', 'widget': WIDGET}])

    def test_a_schematic_is_sent_only_when_named(self):
        self.assertNotIn('schematic', editor_spec('camera', (), translate))
        self.assertEqual(editor_spec('minimap', (), translate, schematic='minimap')['schematic'], 'minimap')
