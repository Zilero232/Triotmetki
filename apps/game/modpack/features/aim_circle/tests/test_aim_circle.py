from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.settings import Settings
from otmetki.features.aim_circle.i18n import STRINGS
from otmetki.features.aim_circle.model import circle_percent, is_scaled, scaled_size
from otmetki.features.aim_circle.model.editor import editor
from otmetki.features.aim_circle.model.widget import circle_widget
from otmetki.features.aim_circle.settings import GROUP, SCHEMA, SECTION, SETTINGS


class AimCircleTest(unittest.TestCase):

    def test_the_circle_starts_at_seventy_percent(self):
        assert Settings(None, SCHEMA).get('size') == 'p70'

    def test_the_circle_offers_the_packs_sizes(self):
        assert SCHEMA.choices['size'] == ('p80', 'p70', 'p60')

    def test_the_game_size_is_not_scaled(self):
        assert is_scaled('stock') is False

    def test_each_smaller_circle_is_its_share(self):
        assert [circle_percent(choice) for choice in ('p80', 'p70', 'p60')] == [80, 70, 60]

    def test_an_unknown_choice_keeps_the_game_size(self):
        assert circle_percent('p10') == 100

    def test_the_size_is_drawn_at_the_share(self):
        assert scaled_size(80.0, 70) == 56.0

    def test_a_size_that_is_not_a_number_stays(self):
        assert scaled_size(None, 70) is None

    def test_the_preview_draws_the_chosen_share(self):
        assert circle_widget('p60')['data']['circle'] == 60

    def test_the_preview_draws_the_reticle_sketch(self):
        assert circle_widget('p60')['data']['sketch'] is True


class AimCircleComponentTest(unittest.TestCase):

    def test_the_circle_keeps_its_switch(self):
        assert SETTINGS == ('battle_aim_circle',)

    def test_the_circle_keeps_its_section(self):
        assert SECTION == 'aim_circle'

    def test_the_circle_shows_in_battle(self):
        assert GROUP == 'battle'

    def test_the_page_offers_the_size(self):
        spec = editor(Settings(None, SCHEMA), str)

        assert spec['groups'][0]['keys'] == ['size']

    def test_the_page_shows_the_game_circle_beside_the_chosen_one(self):
        spec = editor(Settings({'size': 'p60'}, SCHEMA), str)

        assert [sample['widget']['data']['circle'] for sample in spec['samples']] == [100, 60]

    def test_every_label_of_the_page_is_translated(self):
        keys = ['component_aim_circle', 'component_aim_circle_hint', 'aim_circle_size', 'aim_circle_size_hint',
                'aim_circle_group_size', 'aim_circle_sample_stock', 'aim_circle_sample_chosen']
        keys += ['aim_circle_size_%s' % size for size in SCHEMA.choices['size']]

        missing = [key for language in ('ru', 'en') for key in keys if key not in STRINGS[language]]

        assert missing == []

    def test_both_languages_have_the_same_labels(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


if __name__ == '__main__':
    unittest.main()
