# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.moe import ThresholdCurve
from otmetki.core.settings import Settings
from otmetki.features.battle_results.i18n import STRINGS
from otmetki.features.battle_results.model.battle import (
    CardQueue,
    LiveTotals,
    battle_outcome,
    card_text,
    card_widget,
    last_view,
    live_moe,
    live_view,
)
from otmetki.features.battle_results.model.preview import last_sample, live_preview_text, preview_widget
from otmetki.features.battle_results.settings import LAST_SCHEMA, SCHEMA, SETTINGS, SUMMARY_SCHEMA

SNAPSHOT = {'moving_avg_damage': 2950, 'damage_rating': 8412, 'marks_on_gun': 2}
CURVE = {'thresholds': {'65': 2100, '85': 2900, '95': 3500}}
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
DISMISS = {'id': 'otmetki.hud.last_battle', 'label': u'Закрыть'}


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def totals(**values):
    counted = LiveTotals()
    for key, value in values.items():
        counted.add(key, value)
    return counted


def battle(**values):
    base = {'stats': totals(damage=1500).stats(), 'moe': None, 'progress': None, 'vehicle': u'Т-34', 'map': None}
    base.update(values)
    return base


def row_texts(view):
    return [row['text'] for row in view['rows']]


def tile_values(view):
    return dict((tile['label'], tile['value']) for tile in view['tiles'])


class LiveTotalsTest(unittest.TestCase):

    def test_assist_is_spotting_and_tracking(self):
        counted = totals(radio=400, track=300, stun=900)

        assert counted.stats()['assist'] == 700

    def test_the_client_total_raises_the_assist(self):
        counted = totals(radio=400, track=300)

        counted.raise_to('assist_total', 1000)

        assert counted.stats()['assist'] == 1000

    def test_the_marks_metric_takes_the_best_assist_kind(self):
        counted = totals(damage=2000, radio=400, track=300, stun=900)

        assert counted.combined() == 2900

    def test_a_summary_total_never_lowers_a_count(self):
        counted = totals(damage=2000)

        counted.raise_to('damage', 1500)

        assert counted.stats()['damage'] == 2000


class OutcomeTest(unittest.TestCase):

    def test_the_own_team_won(self):
        assert battle_outcome((1, 3), 1) == 'win'

    def test_the_other_team_won(self):
        assert battle_outcome((2, 3), 1) == 'loss'

    def test_team_zero_is_a_draw(self):
        assert battle_outcome((0, 3), 1) == 'draw'

    def test_no_period_info_no_outcome(self):
        assert battle_outcome(None, 1) is None


class LiveViewTest(unittest.TestCase):

    def test_shows_the_own_numbers_as_tiles(self):
        stats = totals(damage=2840, radio=960, track=410, blocked=1350, spotted=3, frags=2).stats()

        view = live_view(battle(stats=stats), translator())

        assert tile_values(view) == {u'Урон': u'2 840', u'Помощь': u'1 370', u'Блок': u'1 350', u'Засвет': u'3',
                                     u'Фраги': u'2'}

    def test_has_no_xp_tile(self):
        view = live_view(battle(), translator('en'))

        assert 'XP' not in tile_values(view)

    def test_the_result_shows_once_known(self):
        view = live_view(battle(result='loss'), translator())

        assert (view['result'], view['result_tone']) == (u'поражение', 'bad')

    def test_no_result_while_the_battle_goes_on(self):
        view = live_view(battle(), translator())

        assert view['result'] is None

    def test_names_the_tank_and_the_map(self):
        view = live_view(battle(map=u'Прохоровка'), translator())

        assert view['subtitle'] == u'Т-34 · Прохоровка'

    def test_the_moe_row_shows_the_projected_percent_and_its_change(self):
        moe = live_moe(SNAPSHOT, 4000, ThresholdCurve.from_api(CURVE))

        row = live_view(battle(moe=moe), translator())['rows'][0]

        assert (row['text'], row['tone']) == (u'Отметка', 'good')

    def test_without_the_site_curve_the_row_shows_the_average_damage(self):
        moe = live_moe(SNAPSHOT, 1000)

        row = live_view(battle(moe=moe), translator())['rows'][0]

        assert (row['text'], row['value'], row['tone']) == (u'Ср. урон', u'2 911', 'bad')

    def test_without_a_dossier_there_is_no_moe_row(self):
        assert live_moe(None, 1000) is None

    def test_main_gun_and_record_rows_come_from_the_battle_progress(self):
        progress = {'main_gun': {'damage': 1500, 'need': 2940, 'status': 'progress'}, 'record': {'damage': 6812}}

        view = live_view(battle(progress=progress), translator())

        assert row_texts(view) == [u'Осн. калибр', u'Рекорд танка']

    def test_a_failed_main_gun_says_so(self):
        progress = {'main_gun': {'damage': 1500, 'need': 2940, 'status': 'failed'}}

        row = live_view(battle(progress=progress), translator())['rows'][0]

        assert (row['value'], row['tone']) == (u'провален', 'bad')

    def test_a_beaten_record_shows_the_margin(self):
        progress = {'record': {'damage': 1000}}

        row = live_view(battle(progress=progress), translator())['rows'][0]

        assert (row['note'], row['tone']) == (u'+500', 'good')

    def test_without_the_battle_progress_there_are_no_target_rows(self):
        view = live_view(battle(), translator())

        assert view['rows'] == []


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
        widget = card_widget(last_sample(translator()), DISMISS)

        assert _support.widget_fixture('battle_summary', widget)

    def test_a_card_without_a_close_mark(self):
        widget = card_widget(last_view(LAST, translator()))

        assert widget['data']['dismiss'] is None

    def test_the_catalog_preview_is_the_battle_card(self):
        widget = preview_widget(Settings({}, SCHEMA), translator())

        assert widget['kind'] == 'battle_summary'

    def test_the_text_fallback_names_the_card(self):
        text = card_text(last_view(LAST, translator()), 14)

        assert u'Прошлый бой' in text

    def test_the_panel_preview_text_takes_the_panel_font_size(self):
        text = live_preview_text(Settings({}, SUMMARY_SCHEMA), translator())

        assert 'size="%d"' % SUMMARY_SCHEMA.fixed['font_size'] in text


class SettingsTest(unittest.TestCase):

    def test_both_battle_cards_have_a_switch(self):
        assert SETTINGS[1:] == ('battle_summary', 'battle_last_results')

    def test_the_summary_card_sits_in_the_right_column(self):
        assert (SUMMARY_SCHEMA.defaults['x'], SUMMARY_SCHEMA.defaults['align_x']) == (-372, 'right')

    def test_the_last_battle_card_sits_in_the_left_column(self):
        assert (LAST_SCHEMA.defaults['x'], LAST_SCHEMA.defaults['align_x']) == (372, 'left')


if __name__ == '__main__':
    unittest.main()
