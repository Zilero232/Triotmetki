# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.event_trackers.i18n import STRINGS
from otmetki.features.event_trackers.model import (
    clean_caravan,
    format_caravan,
    format_triathlon,
    remaining,
    triathlon_view,
)
from otmetki.features.event_trackers.model.triathlon import TriathlonRounds, clean_event, counts, left_s, score
from otmetki.features.event_trackers.model.widget import caravan_widget, triathlon_widget
from otmetki.features.event_trackers.settings import SCHEMA, SETTINGS

START = 1790000000
DAY_S = 86400


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def battle(arena, at, xp, tier=8, bonus_type=1, name=u'Т-34'):
    return {
        'arena_unique_id': str(arena),
        'arena_created_at': at,
        'bonus_type': bonus_type,
        'vehicle': {'tier': tier, 'name': name},
        'stats': {'original_xp': xp},
    }


def filled_rounds():
    rounds = TriathlonRounds()
    for arena, offset, xp in ((1, 0, 900), (2, 600, 1500), (3, 1200, 400), (4, 2400, 1200)):
        rounds.add(battle(arena, START + offset, xp))
    return rounds


def two_rounds():
    rounds = filled_rounds()
    rounds.add(battle(5, START + 3600, 700))
    return rounds


def reloaded_with_garbage():
    data = filled_rounds().dump()
    data['rounds'].append({'start': 'x'})
    data['rounds'][0]['battles'].append({'at': START, 'xp': -1})
    return TriathlonRounds(data)


def running_view(translate):
    event = clean_event({'name': None, 'start': START})
    return triathlon_view(filled_rounds(), event, START + 2400, translate)


def empty_view():
    event = clean_event({'name': None, 'start': START})
    return triathlon_view(TriathlonRounds(), event, START, translator('en'))


def caravan_ending_in_three_days():
    return clean_caravan({'coins': 12, 'finish': START + 3 * DAY_S})


class CountsTest(unittest.TestCase):

    def test_a_random_battle_on_tier_eight_counts(self):
        assert counts(battle(1, START, 100)) is True

    def test_a_battle_below_tier_six_does_not_count(self):
        assert counts(battle(1, START, 100, tier=5)) is False

    def test_a_battle_of_another_mode_does_not_count(self):
        assert counts(battle(1, START, 100, bonus_type=43)) is False

    def test_no_event_does_not_count(self):
        assert counts(None) is False

    def test_the_event_minimum_tier_lowers_the_bar(self):
        assert counts(battle(1, START, 100, tier=5), min_tier=5) is True


class RoundsTest(unittest.TestCase):

    def test_battles_within_sixty_minutes_share_one_round(self):
        rounds = filled_rounds()

        assert len(rounds.rounds) == 1
        assert score(rounds.last(), 3) == 3600

    def test_a_battle_of_a_known_arena_is_not_added_again(self):
        rounds = filled_rounds()

        assert rounds.add(battle(4, START + 2500, 5000)) is False

    def test_a_battle_sixty_minutes_after_the_start_opens_a_new_round(self):
        rounds = filled_rounds()

        added = rounds.add(battle(5, START + 3600, 700))

        assert added is True
        assert len(rounds.rounds) == 2
        assert score(rounds.last(), 3) == 700

    def test_best_score_takes_the_best_round(self):
        assert two_rounds().best_score(3) == 3600

    def test_best_score_counts_only_the_rounds_since_the_start(self):
        assert two_rounds().best_score(3, since=START + 1) == 700

    def test_rounds_survive_a_reload_without_the_garbage(self):
        rounds = reloaded_with_garbage()

        assert len(rounds.rounds) == 1
        assert len(rounds.last()['battles']) == 4

    def test_no_data_loads_no_rounds(self):
        assert TriathlonRounds(None).rounds == []

    def test_malformed_data_loads_no_rounds(self):
        assert TriathlonRounds({'rounds': 'x'}).rounds == []


class TimeLeftTest(unittest.TestCase):

    def test_a_running_round_has_its_seconds_left(self):
        assert left_s(filled_rounds().last(), START + 600) == 3000

    def test_a_finished_round_has_none_left(self):
        assert left_s(filled_rounds().last(), START + 9999) == 0

    def test_remaining_minutes(self):
        assert remaining(3000, translator()) == u'50 минут'

    def test_remaining_days_and_hours(self):
        assert remaining(90000, translator()) == u'1 день 1 час'

    def test_remaining_whole_hours_in_english(self):
        assert remaining(7200, translator('en')) == u'2 hours'

    def test_remaining_rounds_seconds_up_to_a_minute(self):
        assert remaining(10, translator()) == u'1 минута'


class CleanEventTest(unittest.TestCase):

    def test_a_listed_competition_is_kept_with_a_trimmed_name(self):
        raw = {'name': u' Триатлон ', 'cardinality': 3, 'start': START, 'end': START + 10, 'min_tier': 6}

        event = clean_event(raw)

        assert event == {'name': u'Триатлон', 'cardinality': 3, 'start': START, 'end': START + 10, 'min_tier': 6}

    def test_values_out_of_range_fall_back_to_the_defaults(self):
        event = clean_event({'cardinality': 0, 'min_tier': 99})

        assert event['cardinality'] == 3
        assert event['min_tier'] == 6

    def test_no_competition_is_none(self):
        assert clean_event(None) is None


class TriathlonCardTest(unittest.TestCase):

    def test_view_of_a_running_round(self):
        view = running_view(translator())

        assert view['running'] is True
        assert view['score'] == 3600
        assert view['count'] == 4
        assert [item['xp'] for item in view['battles']] == [1500, 1200, 900]

    def test_text_shows_the_score_the_time_left_and_the_battle_count(self):
        translate = translator()

        text = format_triathlon(running_view(translate), Settings({}, SCHEMA), translate)

        assert u'Триатлон: 3 600' in text
        assert u'Раунд: осталось 20 минут' in text
        assert u'В раунде: 4 боя' in text

    def test_widget_shows_the_score_and_the_best_battle_first(self):
        translate = translator()

        data = triathlon_widget(running_view(translate), translate)['data']

        assert data['value'] == u'3 600'
        assert data['rows'][0]['label'] == u'1.'
        assert data['rows'][0]['value'] == u'1 500'

    def test_widget_footer_states_the_rule(self):
        translate = translator()

        data = triathlon_widget(running_view(translate), translate)['data']

        assert data['footer'] == u'Сумма 3 лучших боёв по чистому опыту за 60 минут · случайные бои, VI+'

    def test_view_without_rounds_waits_for_the_first_battle(self):
        view = empty_view()

        assert view['score'] is None
        assert view['state'] == u'The round starts with the first battle'

    def test_widget_without_rounds_has_no_value(self):
        data = triathlon_widget(empty_view(), translator('en'))['data']

        assert data['value'] is None


class CaravanTest(unittest.TestCase):

    def test_text_shows_the_tokens_and_the_time_left(self):
        text = format_caravan(caravan_ending_in_three_days(), START, Settings({}, SCHEMA), translator())

        assert u'Торговый караван: 12 жетонов' in text
        assert u'До конца: 3 дня' in text

    def test_widget_shows_the_tokens_and_the_time_left(self):
        data = caravan_widget(caravan_ending_in_three_days(), START, translator('en'))['data']

        assert data['value'] == u'12 tokens'
        assert data['rows'][0]['value'] == u'3 days'

    def test_invalid_reads_clean_to_no_tokens_and_no_end(self):
        assert clean_caravan({'coins': 'x', 'finish': 0}) == {'coins': 0, 'finish': None}

    def test_no_reads_is_none(self):
        assert clean_caravan(None) is None

    def test_widget_without_an_end_has_no_rows(self):
        data = caravan_widget(clean_caravan({'coins': 1}), START, translator())['data']

        assert data['rows'] == []


class SettingsTest(unittest.TestCase):

    def test_settings_switch(self):
        assert SETTINGS == ('hangar_event_trackers',)

    def test_strings_in_both_languages(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


class FixedSettingsTest(unittest.TestCase):

    def test_the_font_size_is_fixed(self):
        assert 'font_size' not in SCHEMA.defaults
        assert Settings({'font_size': 30}, SCHEMA).get('font_size') == 14


if __name__ == '__main__':
    unittest.main()
