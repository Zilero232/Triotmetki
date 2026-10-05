# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.format import strip_tags
from otmetki.core.moe import ThresholdCurve
from otmetki.core.settings import Settings
from otmetki.features.marks_panel.i18n import STRINGS
from otmetki.features.marks_panel.model import hangar_state
from otmetki.features.marks_panel.model.card import TankCard, card_text, tank_card
from otmetki.features.marks_panel.model.research import battles_left, next_vehicles, research_state, to_elite
from otmetki.features.marks_panel.settings import CARD_SCHEMA

CURVE = {'thresholds': {'65': 2000, '85': 2600, '95': 3100, '100': 4000}}
SNAPSHOT = {'tank_id': 1, 'moving_avg_damage': 2500, 'damage_rating': 8150, 'marks_on_gun': 1, 'mastery': 2}
MASTERY = ((1, 540), (2, 710), (3, 960), (4, 1320))
GUN = {'id': 11, 'cost': 20000, 'vehicle': False, 'name': u'Gun', 'tier': 7, 'required': ()}
ENGINE = {'id': 12, 'cost': 5000, 'vehicle': False, 'name': u'Engine', 'tier': 7, 'required': ()}
NEXT_TANK = {'id': 21, 'cost': 60000, 'vehicle': True, 'name': u'T-54', 'tier': 9, 'required': (11,)}
OTHER_TANK = {'id': 22, 'cost': 40000, 'vehicle': True, 'name': u'IS', 'tier': 8, 'required': ()}
RESEARCH = {'xp': 15000, 'elite': False, 'avg_xp': 1000, 'nodes': (GUN, ENGINE, NEXT_TANK, OTHER_TANK)}


def translator(language='en'):
    return _support.translator(STRINGS, language)


def tank(held=True, mastery=MASTERY, own_mastery=2, research=RESEARCH):
    state = hangar_state(SNAPSHOT, ThresholdCurve.from_api(CURVE), 3000)
    return TankCard(state, u'T-44', None, None, held, mastery, own_mastery, research_state(research))


def rows(data, **values):
    return tank_card(data, Settings(values, CARD_SCHEMA), translator())['data']['rows']


def texts(data, **values):
    return [row['text'] for row in rows(data, **values)]


class ResearchTest(unittest.TestCase):

    def test_elite_needs_every_locked_node_less_the_tank_xp(self):
        assert to_elite(RESEARCH) == 20000 + 5000 + 60000 + 40000 - 15000

    def test_an_elite_tank_has_nothing_left(self):
        assert to_elite(dict(RESEARCH, elite=True)) is None

    def test_a_next_tank_adds_the_modules_it_needs_first(self):
        by_name = dict((row['name'], row['need']) for row in next_vehicles(RESEARCH))

        assert by_name == {u'T-54': 20000 + 60000 - 15000, u'IS': 40000 - 15000}

    def test_the_cheapest_next_tank_comes_first(self):
        assert [row['name'] for row in next_vehicles(RESEARCH)] == [u'IS', u'T-54']

    def test_battles_at_the_average_xp_round_up(self):
        assert battles_left(2500, 1000) == 3
        assert battles_left(0, 1000) == 0
        assert battles_left(2500, None) is None

    def test_enough_xp_needs_nothing(self):
        state = research_state(dict(RESEARCH, xp=500000))

        assert state['elite'] == 0
        assert [row['need'] for row in state['vehicles']] == [0, 0]

    def test_nothing_left_to_research_has_no_state(self):
        assert research_state({'xp': 100, 'elite': True, 'nodes': ()}) is None
        assert research_state(None) is None


class CardTest(unittest.TestCase):

    def test_the_thresholds_list_the_100_percent_too(self):
        labels = [row['label'] for row in rows(tank(held=False)) if row['label']]

        assert labels == [u'65%', u'85%', u'95%', u'100%']

    def test_the_next_mastery_badge_shows_its_xp_and_the_others_in_the_detail(self):
        badge = [row for row in rows(tank()) if row['label'] == u'Badge'][0]

        assert (badge['text'], badge['value'], badge['note']) == (u'1st', u'960', u'XP per battle')
        assert badge['detail'] == u'3rd 540 · 2nd 710 · 1st 960 · Ace 1 320'

    def test_an_ace_holder_sees_it_done(self):
        badge = [row for row in rows(tank(own_mastery=4)) if row['label'] == u'Badge'][0]

        assert badge['status'] == 'done'

    def test_the_research_rows_show_the_xp_and_the_battles(self):
        research = [row for row in rows(tank()) if row['text'] in (u'To elite', u'IS', u'T-54')]

        assert [(row['text'], row['value'], row['note']) for row in research] == [
            (u'To elite', u'110 000', u'~110 battles'),
            (u'IS', u'25 000', u'~25 battles'),
            (u'T-54', u'65 000', u'~65 battles'),
        ]

    def test_the_progress_rows_wait_for_alt(self):
        shown = texts(tank(held=False))

        assert u'To elite' not in shown
        assert u'1st' not in shown

    def test_the_alt_hint_shows_while_progress_rows_are_hidden(self):
        card = tank_card(tank(held=False), Settings({}, CARD_SCHEMA), translator())['data']

        assert card['footer'] == u'Alt: more'

    def test_the_switches_hide_the_progress_rows(self):
        shown = texts(tank(), show_mastery=False, show_research=False)

        assert u'To elite' not in shown
        assert u'1st' not in shown

    def test_no_site_mastery_leaves_the_badge_out(self):
        assert u'Badge' not in [row['label'] for row in rows(tank(mastery=None))]

    def test_the_text_card_carries_the_same_lines(self):
        text = strip_tags(card_text(tank(), Settings({}, CARD_SCHEMA), translator()))

        assert u'Mastery badges, XP per battle: 3rd 540' in text
        assert u'To elite 110 000 (~110 battles)' in text
        assert u'100%: ' in text


if __name__ == '__main__':
    unittest.main()
