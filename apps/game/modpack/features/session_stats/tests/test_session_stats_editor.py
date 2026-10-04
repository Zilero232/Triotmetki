from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

from otmetki.companion.i18n import STRINGS as COMPANION_STRINGS
from otmetki.companion.i18n import Translator
from otmetki.core.i18n import Catalog
from otmetki.core.settings import Settings
from otmetki.features.session_stats.i18n import STRINGS
from otmetki.features.session_stats.model.editor import editor
from otmetki.features.session_stats.settings import ADVANCED, SCHEMA


def spec(**values):
    return editor(Settings(values, SCHEMA), Translator('en', Catalog(COMPANION_STRINGS, STRINGS)))


def card(**values):
    return spec(**values)['samples'][0]['widget']['data']


def labels(**values):
    return [row.get('label') for row in card(**values)['rows']]


def grouped():
    return [key for group in spec()['groups'] for key in group['keys']]


class EditorTest(unittest.TestCase):

    def test_the_groups_hold_only_fields_of_the_schema(self):
        assert set(grouped()) <= set(SCHEMA.defaults)

    def test_every_field_but_the_advanced_ones_is_grouped(self):
        assert sorted(grouped()) == sorted(set(SCHEMA.defaults) - set(ADVANCED))

    def test_the_card_counts_the_sample_battles(self):
        assert card()['value'] == '7 battles'

    def test_the_card_drops_each_part_switched_off(self):
        rows = len(card()['rows'])

        assert len(card(show_moe=False)['rows']) == rows - 1
        assert len(card(show_goals=False)['rows']) == rows - 2
        assert len(card(show_account=False)['rows']) == rows - 1

    def test_the_goals_follow_their_count(self):
        assert len(card(max_goals=1)['rows']) == len(card()['rows']) - 1

    def test_the_account_line_follows_the_metrics(self):
        assert card(metric_wn8=False)['rows'][-1] != card()['rows'][-1]

    def test_the_sample_has_a_caption(self):
        assert spec()['samples'][0]['label'] == STRINGS['en']['session_stats_sample_card']


if __name__ == '__main__':
    unittest.main()
