# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.hud.panel import ATTACHED
from otmetki.core.settings import Settings
from otmetki.features.battle_results.i18n import STRINGS
from otmetki.features.battle_results.model.battle import CardQueue, card_text, card_widget, last_view
from otmetki.features.battle_results.model.battle.constants import LAST_SHOW_S
from otmetki.features.battle_results.model.preview import last_preview_text, last_sample, preview_widget
from otmetki.features.battle_results.settings import LAST_SCHEMA, SCHEMA, SETTINGS

LAST = {
    'arena': '1',
    'vehicle': u'Т-34',
    'map': u'Малиновка',
    'result': 'win',
    'damage': 1960,
    'xp': 812,
    'net_credits': 23450,
    'moe_percent': 84.0,
    'moe_delta': 0.42,
}


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def tile_values(view):
    return dict((tile['label'], tile['value']) for tile in view['tiles'])


class LastViewTest(unittest.TestCase):

    def test_shows_damage_xp_and_net_credits(self):
        view = last_view(LAST, translator())

        assert tile_values(view) == {u'Урон': u'1 960', u'Опыт': u'812', u'Кредиты': u'23 450'}

    def test_names_the_map_the_tank_and_the_result(self):
        view = last_view(LAST, translator())

        assert (view['subtitle'], view['result']) == (u'Т-34 · Малиновка', u'победа')

    def test_shows_the_moe_change(self):
        row = last_view(LAST, translator())['rows'][0]

        assert (row['value'], row['note'], row['tone']) == (u'84.00%', u'+0.42%', 'good')

    def test_no_moe_no_row(self):
        view = last_view(dict(LAST, moe_percent=None), translator())

        assert view['rows'] == []


class CardQueueTest(unittest.TestCase):

    def test_the_first_card_shows_at_once(self):
        queue = CardQueue()

        assert queue.push('a') is True

    def test_a_card_waits_behind_the_shown_one(self):
        queue = CardQueue()
        queue.push('a')

        assert queue.push('b') is False

    def test_cards_show_in_arrival_order(self):
        queue = CardQueue()
        queue.push('a')
        queue.push('b')

        assert queue.advance() == 'b'

    def test_the_queue_ends_empty(self):
        queue = CardQueue()
        queue.push('a')

        assert queue.advance() is None

    def test_past_its_size_the_oldest_waiting_card_is_dropped(self):
        queue = CardQueue(size=2)
        for card in ('a', 'b', 'c', 'd'):
            queue.push(card)

        assert queue.waiting == ['c', 'd']


class WidgetTest(unittest.TestCase):

    def test_the_card_widget_is_the_page_fixture(self):
        widget = card_widget(last_sample(translator()), LAST_SHOW_S)

        assert _support.widget_fixture('battle_summary', widget)

    def test_the_card_has_nothing_to_click(self):
        widget = card_widget(last_view(LAST, translator()), LAST_SHOW_S)

        assert 'dismiss' not in widget['data']

    def test_the_card_carries_how_long_it_shows_and_which_battle_it_is(self):
        data = card_widget(last_view(LAST, translator()), LAST_SHOW_S)['data']

        assert (data['show_s'], data['card']) == (LAST_SHOW_S, u'1')

    def test_the_card_hides_by_itself_within_ten_seconds(self):
        assert 8 <= LAST_SHOW_S <= 10

    def test_the_catalog_preview_is_the_previous_battle_card(self):
        widget = preview_widget(Settings({}, SCHEMA), translator())

        assert (widget['kind'], widget['data']['title']) == ('battle_summary', u'Прошлый бой')

    def test_the_text_fallback_names_the_card(self):
        text = card_text(last_view(LAST, translator()), 14)

        assert u'Прошлый бой' in text

    def test_the_panel_preview_text_takes_the_panel_font_size(self):
        text = last_preview_text(Settings({}, LAST_SCHEMA), translator())

        assert 'size="%d"' % LAST_SCHEMA.fixed['font_size'] in text


class SettingsTest(unittest.TestCase):

    def test_only_the_previous_battle_card_has_a_battle_switch(self):
        assert SETTINGS[1:] == ('battle_last_results',)

    def test_the_card_sits_right_above_the_middle_minimap(self):
        place = tuple(LAST_SCHEMA.defaults[key] for key in ('x', 'y', 'align_x', 'align_y'))

        assert place == (-8, -(310 + 12), 'right', 'bottom')

    def test_the_card_follows_the_minimap_size(self):
        assert ATTACHED['otmetki.hud.last_battle'] == 'minimap_above'

    def test_a_card_at_its_old_top_left_place_moves(self):
        assert (372, 60, 'left', 'top') in LAST_SCHEMA.retired


if __name__ == '__main__':
    unittest.main()
