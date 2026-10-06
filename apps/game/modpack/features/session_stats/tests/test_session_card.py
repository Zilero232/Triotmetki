# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import unittest

import _support
from otmetki.companion.i18n import STRINGS as COMPANION_STRINGS
from otmetki.companion.i18n import Translator
from otmetki.core.i18n import Catalog
from otmetki.core.settings import Settings
from otmetki.features.session_stats.i18n import STRINGS
from otmetki.features.session_stats.model import (
    SessionView,
    format_session_panel,
    format_session_plain,
    goal_done_notice,
    parse_goals,
    parse_overview,
    session_widget,
)
from otmetki.core.format import TIER_COLORS
from otmetki.features.session_stats.model.ratings import wn8_tier
from otmetki.features.session_stats.settings import SCHEMA, SETTINGS

ACCOUNT = 12345678


def example(name):
    return _support.load_json(os.path.join(_support.CONTRACT_DIR, 'examples', name))


def goals():
    return parse_goals(example('goals.example.json'), ACCOUNT)


def overview():
    return parse_overview(example('ratings-overview.example.json'), ACCOUNT)


def settings(**values):
    return Settings(values, SCHEMA)


def translator(language='ru'):
    return Translator(language, Catalog(COMPANION_STRINGS, STRINGS))


def summary(**fields):
    values = {'battles': 12, 'win_rate': 58.33, 'avg_damage': 2140.0, 'wn8': 2310.0, 'recent': [], 'pending': 0}
    values.update(fields)
    return values


def card_data(view, language='ru', **values):
    return session_widget(view, settings(**values), translator(language))['data']


def account_row(**values):
    return card_data(SessionView(summary(), overview=overview()), **values)['rows'][-1]


class HeaderTest(unittest.TestCase):

    def test_the_header_counts_the_battles(self):
        data = card_data(SessionView(summary()))

        assert data['value'] == u'12 боёв'

    def test_waiting_battles_are_a_caption(self):
        data = card_data(SessionView(summary(pending=1)))

        assert data['subtitle'] == u'1 ждёт итогов'

    def test_several_waiting_battles_agree_with_the_count(self):
        data = card_data(SessionView(summary(pending=3)), 'en')

        assert data['subtitle'] == u'3 await results'

    def test_no_caption_without_waiting_battles(self):
        assert card_data(SessionView(summary()))['subtitle'] is None


class NumbersTest(unittest.TestCase):

    def test_chips_show_the_win_rate_damage_and_wn8(self):
        chips = card_data(SessionView(summary()))['chips']

        assert [chip['value'] for chip in chips] == [u'58.33%', u'2 140', u'2 310']

    def test_a_win_rate_from_50_percent_is_good(self):
        chips = card_data(SessionView(summary(win_rate=50.0)))['chips']

        assert chips[0]['tone'] == 'good'

    def test_a_win_rate_below_50_percent_is_bad(self):
        chips = card_data(SessionView(summary(win_rate=49.0)))['chips']

        assert chips[0]['tone'] == 'bad'

    def test_the_session_wn8_takes_its_rating_colour(self):
        chips = card_data(SessionView(summary()))['chips']

        assert chips[2]['color'] == TIER_COLORS['great']

    def test_no_wn8_chip_before_the_server_answers(self):
        chips = card_data(SessionView(summary(wn8=None)))['chips']

        assert len(chips) == 2

    def test_the_strip_shows_the_last_results(self):
        data = card_data(SessionView(summary(recent=['win', 'draw', 'loss'])))

        assert data['strip'] == ['good', 'muted', 'bad']


class Wn8TierTest(unittest.TestCase):

    def test_a_lower_bound_starts_its_tier(self):
        assert wn8_tier(2000) == 'great'

    def test_below_the_first_bound_is_the_lowest_tier(self):
        assert wn8_tier(-5) == 'very_bad'

    def test_above_the_last_bound_is_the_highest_tier(self):
        assert wn8_tier(5000) == 'super_unicum'

    def test_no_tier_without_a_number(self):
        assert wn8_tier(None) is None


class EmptyTest(unittest.TestCase):

    def test_an_empty_session_shows_zero_battles(self):
        data = card_data(SessionView({}))

        assert data['value'] == u'0 боёв'

    def test_an_empty_session_has_no_numbers(self):
        assert card_data(SessionView({}))['chips'] == []

    def test_an_empty_session_keeps_the_account_line(self):
        data = card_data(SessionView({}, overview=overview()))

        assert [row['label'] for row in data['rows']] == [u'Аккаунт']


class GoalRowsTest(unittest.TestCase):

    def test_a_goal_row_shows_its_current_value(self):
        row = card_data(SessionView(summary(), goals()))['rows'][0]

        assert (row['text'], row['value']) == (u'Ср. урон 3 000', u'2 740')

    def test_a_goal_row_carries_a_gold_bar(self):
        row = card_data(SessionView(summary(), goals()))['rows'][0]

        assert (row['progress'], row['progress_tone']) == (0.56, 'gold')

    def test_a_tank_goal_names_its_tank(self):
        row = card_data(SessionView(summary(), goals(), vehicle_names={1: u'T-34'}))['rows'][1]

        assert row['text'] == u'Отметка 85.00% на T-34'

    def test_a_done_goal_is_ticked_in_good(self):
        row = card_data(SessionView(summary(), goals()))['rows'][2]

        assert (row['value'], row['tone']) == (u'✓', 'good')

    def test_the_done_notice_names_the_goal(self):
        notice = goal_done_notice(goals()[1], translator(), u'T-34')

        assert notice == u'Три отметки: цель выполнена — Отметка 85.00% на T-34'


class AccountRowTest(unittest.TestCase):

    def test_the_account_row_leads_with_its_wn8(self):
        assert account_row()['value'] == u'WN8 1 850'

    def test_the_account_wn8_takes_its_tier_colour(self):
        assert account_row()['color'] == TIER_COLORS['good']

    def test_the_account_row_lists_win_rate_and_damage(self):
        assert account_row()['text'] == u'53.41% · 1 654'

    def test_eff_joins_the_facts_when_switched_on(self):
        assert account_row(metric_eff=True)['text'] == u'53.41% · 1 654 · ЭФФ 1 321'

    def test_metric_switches_leave_facts_out(self):
        assert account_row(metric_win_rate=False)['text'] == u'1 654'

    def test_an_untracked_account_says_the_ratings_come_later(self):
        data = card_data(SessionView(summary(), overview={'overall': None}))

        assert data['rows'][0]['text'].startswith(u'Рейтинги аккаунта появятся')

    def test_no_account_row_with_every_metric_off(self):
        values = dict(metric_wn8=False, metric_win_rate=False, metric_avg_damage=False)

        data = card_data(SessionView(summary(), overview=overview()), **values)

        assert data['rows'] == []


class TextTest(unittest.TestCase):

    def test_the_text_header_counts_the_battles(self):
        text = format_session_panel(SessionView(summary()), settings(), translator('en'))

        assert u'Session · 12 battles' in text

    def test_the_text_shows_the_win_rate(self):
        text = format_session_panel(SessionView(summary()), settings(), translator('en'))

        assert u'58.33%' in text

    def test_the_text_shows_the_strip(self):
        text = format_session_panel(SessionView(summary(recent=['win', 'loss'])), settings(), translator('en'))

        assert u'Last</font>: <font color="#7CD35B">W</font> <font color="#E3564A">L</font>' in text

    def test_the_text_shows_the_waiting_battles(self):
        text = format_session_panel(SessionView(summary(pending=3)), settings(), translator('en'))

        assert u'3 await results' in text

    def test_the_text_shows_the_goal_progress(self):
        text = format_session_panel(SessionView(summary(), goals()), settings(), translator())

        assert u'2 740 (56%)' in text

    def test_the_text_shows_the_account_line(self):
        text = format_session_panel(SessionView(summary(), overview=overview()), settings(), translator())

        assert u'WN8 1 850 · 53.41% · 1 654' in text

    def test_an_empty_session_text_has_no_numbers(self):
        text = format_session_panel(SessionView({}), settings(), translator('en'))

        assert u'Win rate' not in text

    def test_plain_line_lists_every_value(self):
        text = format_session_plain(summary(battles=5, win_rate=60.0, avg_damage=2100.0, wn8=None), translator('en'))

        assert text == u'Session: Battles 5, Win rate 60.00%, Avg dmg 2 100, WN8 -'


class SettingsTest(unittest.TestCase):

    def test_the_config_keys(self):
        assert SETTINGS == ('hangar_session_panel', 'session_idle_minutes', 'share_session_report',
                            'share_session_channel')

    def test_strings_are_in_sync(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])

    def test_every_setting_has_a_label(self):
        missing = [key for key in SCHEMA.defaults if 'session_stats_' + key not in STRINGS['ru']]

        assert missing == []


if __name__ == '__main__':
    unittest.main()
