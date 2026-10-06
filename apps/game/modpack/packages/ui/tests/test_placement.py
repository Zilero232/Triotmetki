# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import io
import json
import os
import unittest

import _support  # noqa: F401
from otmetki.ui.components import PANEL_OWNERS, PLACEMENT, SECTIONS, placement_of

CATALOG = os.path.join(_support.MODPACK_DIR, 'catalog', 'catalog.json')
WINDOW_ONLY = ('core', 'ui')
DATA_PACKAGES = ('hangar_looks',)
CONTEXTS = ('hangar', 'battle', 'any')


def catalog_contexts():
    with io.open(CATALOG, 'r', encoding='utf-8') as handle:
        entries = json.load(handle)['components']
    return {entry['id']: entry['context'] for entry in entries if entry.get('kind') is None}


def placed_components():
    contexts = catalog_contexts()
    placed = [component_id for component_id in contexts if component_id not in WINDOW_ONLY + DATA_PACKAGES]
    return {component_id: contexts[component_id] for component_id in placed}


def part_ids(package_id):
    try:
        settings = importlib.import_module('otmetki.features.%s.settings' % package_id)
    except ImportError:
        return []
    return [part['id'] for part in getattr(settings, 'PARTS', ())]


def window_context(package_id):
    contexts = set(PLACEMENT[component_id][1] for component_id in [package_id] + part_ids(package_id))
    return contexts.pop() if len(contexts) == 1 else 'any'


class PlacementTest(unittest.TestCase):

    def test_every_catalogued_component_has_a_page(self):
        missing = [component_id for component_id in placed_components() if component_id not in PLACEMENT]

        assert missing == []

    def test_every_part_of_a_catalogued_package_has_a_page(self):
        missing = [part_id for package_id in placed_components() for part_id in part_ids(package_id)
                   if part_id not in PLACEMENT]

        assert missing == []

    def test_every_catalogued_package_has_the_context_of_its_pages(self):
        contexts = placed_components()

        mismatched = [
            (component_id, window_context(component_id), context)
            for component_id, context in contexts.items()
            if component_id in PLACEMENT and window_context(component_id) != context
        ]

        assert mismatched == []

    def test_the_marks_package_shows_in_the_hangar_and_in_battle(self):
        assert window_context('marks_panel') == 'any'

    def test_placements_use_known_sections(self):
        unknown = [component_id for component_id, (section, _) in PLACEMENT.items() if section not in SECTIONS]

        assert unknown == []

    def test_placements_use_known_contexts(self):
        unknown = [component_id for component_id, (_, context) in PLACEMENT.items() if context not in CONTEXTS]

        assert unknown == []

    def test_an_unknown_panel_goes_to_battle(self):
        assert placement_of('new_panel', 'battle', panel=True) == ('battle', 'battle')

    def test_an_unknown_hangar_component_goes_to_hangar(self):
        assert placement_of('new_label', 'hangar') == ('hangar', 'hangar')

    def test_an_unknown_data_component_goes_to_data_in_the_hangar(self):
        assert placement_of('new_share', 'data') == ('data', 'hangar')

    def test_a_known_component_keeps_its_placement_whatever_its_group(self):
        assert placement_of('marks_panel', 'hangar') == ('battle', 'battle')

    def test_the_tank_card_sits_on_the_hangar_page(self):
        assert placement_of('hangar_marks', 'battle', panel=True) == ('hangar', 'hangar')

    def test_the_battle_summaries_sit_where_they_show(self):
        assert placement_of('battle_results', 'hangar')[0] == 'hangar'
        assert placement_of('last_battle', 'battle', panel=True)[0] == 'battle'

    def test_a_component_page_follows_where_it_shows(self):
        mismatched = [
            component_id for component_id, (section, context) in PLACEMENT.items()
            if section in ('battle', 'hangar') and context != 'any' and section != context
        ]

        assert mismatched == []

    def test_every_panel_owner_is_a_placed_component(self):
        unknown = [
            owner for panel_id, owner in PANEL_OWNERS.items() if panel_id not in PLACEMENT or owner not in PLACEMENT
        ]

        assert unknown == []


if __name__ == '__main__':
    unittest.main()
