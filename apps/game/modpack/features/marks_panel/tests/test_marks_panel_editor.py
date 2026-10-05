from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.settings import Settings
from otmetki.features.marks_panel.i18n import STRINGS
from otmetki.features.marks_panel.model.editor import card_editor, editor
from otmetki.features.marks_panel.settings import ADVANCED, CARD_ADVANCED, CARD_SCHEMA, PARTS, SCHEMA

PANEL_KEYS = ('x', 'y', 'align_x', 'align_y', 'drag', 'scale', 'alpha', 'font_size', 'border')


def translate(key, **params):
    return key


def battle_spec():
    return editor(Settings(None, SCHEMA), translate)


def card_spec():
    return card_editor(Settings(None, CARD_SCHEMA), translate)


def grouped_keys(spec):
    return [key for group in spec['groups'] for key in group['keys']]


class BattleEditorTest(unittest.TestCase):

    def test_groups_name_only_schema_keys(self):
        for key in grouped_keys(battle_spec()):
            assert key in SCHEMA.defaults, key

    def test_every_kept_field_is_in_a_group(self):
        kept = set(SCHEMA.defaults) - set(PANEL_KEYS) - set(ADVANCED)

        assert kept <= set(grouped_keys(battle_spec())), sorted(kept - set(grouped_keys(battle_spec())))

    def test_advanced_fields_stay_out_of_the_groups(self):
        assert not set(ADVANCED) & set(grouped_keys(battle_spec()))

    def test_every_group_has_a_label_in_both_languages(self):
        for group in battle_spec()['groups']:
            for language in ('ru', 'en'):
                assert group['label'] in STRINGS[language], (language, group['label'])

    def test_the_page_previews_only_the_battle_panel(self):
        assert 'samples' not in battle_spec()


class CardEditorTest(unittest.TestCase):

    def test_groups_name_only_schema_keys(self):
        for key in grouped_keys(card_spec()):
            assert key in CARD_SCHEMA.defaults, key

    def test_every_kept_field_is_in_a_group(self):
        kept = set(CARD_SCHEMA.defaults) - set(PANEL_KEYS) - set(CARD_ADVANCED)

        assert kept <= set(grouped_keys(card_spec())), sorted(kept - set(grouped_keys(card_spec())))

    def test_advanced_fields_stay_out_of_the_groups(self):
        assert not set(CARD_ADVANCED) & set(grouped_keys(card_spec()))

    def test_every_group_has_a_label_in_both_languages(self):
        for group in card_spec()['groups']:
            for language in ('ru', 'en'):
                assert group['label'] in STRINGS[language], (language, group['label'])

    def test_the_page_previews_only_the_tank_card(self):
        assert 'samples' not in card_spec()

    def test_the_card_is_a_part_with_its_own_editor_and_switch(self):
        part = PARTS[0]

        assert (part['id'], part['switch'], part['editor']) == ('hangar_marks', 'hangar_tank_card', 'card_editor')


class LabelTest(unittest.TestCase):

    def test_every_card_field_has_a_label_in_both_languages(self):
        fields = set(CARD_SCHEMA.defaults) - set(PANEL_KEYS)

        for language in ('ru', 'en'):
            missing = sorted(key for key in fields if 'hangar_marks_%s' % key not in STRINGS[language])
            assert missing == [], language

    def test_every_battle_field_has_a_label_in_both_languages(self):
        fields = set(SCHEMA.defaults) - set(PANEL_KEYS)

        for language in ('ru', 'en'):
            missing = sorted(key for key in fields if 'marks_panel_%s' % key not in STRINGS[language])
            assert missing == [], language


if __name__ == '__main__':
    unittest.main()
