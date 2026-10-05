# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.format import COLOR_DOWN, COLOR_NEUTRAL, COLOR_UP, MARK_COLORS
from otmetki.core.moe import (
    EMA_K,
    PaceBook,
    ThresholdCache,
    ThresholdCurve,
    battle_combined,
    battles_to_reach,
    combined_damage,
    estimated_curve,
    moe_color,
    moe_macros,
    moe_state,
    next_level,
    next_whole_percent,
    project_moving_avg,
    rating_change,
    rating_to_percent,
    required_battle_damage,
    results_rating,
    threshold_problem,
)
from otmetki.core.moe.constants import PACE_BATTLES, THRESHOLD_ERROR_TTL_S, THRESHOLD_TTL_S

API = {'tank_id': 1, 'thresholds': {'65': 2000, '85': 2600, '95': 3100, '100': 4200}}
LEVELS = (65.0, 85.0, 95.0)


def curve():
    return ThresholdCurve.from_api(API)


def curve_without_100():
    return ThresholdCurve.from_api({'thresholds': {'65': 2000, '85': 2600, '95': 3100}})


def dense_api():
    return {
        'thresholds': {'65': 2000, 'x': 1, '85': 'bad'},
        'curve': [
            {'percent': 50, 'damage': 1700},
            {'percent': 70, 'damage': 1600},
            {'percent': 95, 'damage': 3000},
        ],
    }


def event(tank_id, arena, damage, radio=0, track=0):
    stats = {
        'damage_dealt': damage,
        'damage_assisted_radio': radio,
        'damage_assisted_track': track,
        'damage_assisted_stun': 0,
    }
    return {'vehicle': {'tank_id': tank_id}, 'arena_unique_id': arena, 'stats': stats}


def book_with_three_battles():
    book = PaceBook()
    book.record_event(event(1, 10, 1000, 300, 500))
    book.record_event(event(1, 11, 2000))
    book.record_event(event(1, 12, 3000))
    return book


def book_filled_past_the_window():
    book = PaceBook()
    for arena in range(PACE_BATTLES + 5):
        book.record(7, arena, arena)
    return book


class CombinedDamageTest(unittest.TestCase):

    def test_adds_the_better_of_radio_and_track_assist(self):
        assert combined_damage(1000, 300, 500, 200) == 1500

    def test_adds_the_stun_assist_when_it_is_the_best(self):
        assert combined_damage(1000, 0, 0, 700) == 1700


class EmaTest(unittest.TestCase):

    def test_ema_factor_is_for_100_battles(self):
        self.assertAlmostEqual(EMA_K, 2.0 / 101)

    def test_ema_factor_is_not_the_python_2_integer_division_zero(self):
        assert EMA_K > 0.0198

    def test_one_battle_moves_the_average_by_its_share_even_from_integers(self):
        assert project_moving_avg(2751, 5663) > 2751

    def test_moving_average_moves_towards_the_battle_damage(self):
        self.assertAlmostEqual(project_moving_avg(2000, 4020), 2040)

    def test_required_damage_lifts_the_average_to_the_target(self):
        required = required_battle_damage(2500, 2600)

        self.assertAlmostEqual(required, 7550)
        self.assertAlmostEqual(project_moving_avg(2500, required), 2600)

    def test_no_damage_is_required_above_the_target(self):
        assert required_battle_damage(3000, 2600) == 0.0

    def test_rating_converts_to_a_percent(self):
        assert rating_to_percent(8712) == 87.12

    def test_missing_rating_has_no_percent(self):
        assert rating_to_percent(None) is None


class ThresholdProblemTest(unittest.TestCase):

    def test_a_usable_curve_has_no_problem(self):
        assert threshold_problem(200, API, ThresholdCurve.from_api(API)) is None

    def test_the_sites_404_is_named_with_its_error(self):
        data = {'error': 'No MoE thresholds for tank 7940641', 'code': 'NOT_FOUND'}

        problem = threshold_problem(404, data, None)

        assert problem == 'the site answered 404: No MoE thresholds for tank 7940641'

    def test_a_network_failure_is_named(self):
        assert threshold_problem(0, None, None) == 'no answer (network)'

    def test_an_answer_without_thresholds_is_named(self):
        assert threshold_problem(200, {'thresholds': {}}, None) == 'the answer has no usable thresholds'


class ResultsRatingTest(unittest.TestCase):

    def test_the_results_whole_percent_becomes_hundredths(self):
        assert results_rating(67) == 6700

    def test_no_results_rating_below_tier_five(self):
        assert results_rating(0) is None

    def test_a_battle_change_is_the_difference_in_percent(self):
        assert rating_change(6647, 6689) == 0.42

    def test_a_wrong_scale_change_is_no_change(self):
        assert rating_change(6647, 67) is None


class BattlesToReachTest(unittest.TestCase):

    def test_zero_battles_when_the_target_is_reached(self):
        assert battles_to_reach(2600, 2600, None) == 0

    def test_never_when_the_pace_equals_the_target(self):
        assert battles_to_reach(2500, 2600, 2600) is None

    def test_unknown_without_a_pace(self):
        assert battles_to_reach(2500, 2600, None) is None

    def test_unknown_without_an_average(self):
        assert battles_to_reach(None, 2600, 3000) is None

    def test_counts_the_battles_at_the_pace(self):
        assert battles_to_reach(2500, 2600, 3000) == 12

    def test_the_counted_battle_is_the_first_to_reach_the_target(self):
        average = 2500.0
        for _ in range(11):
            average = project_moving_avg(average, 3000)

        after_the_last_battle = project_moving_avg(average, 3000)

        assert average < 2600
        assert after_the_last_battle >= 2600

    def test_a_slow_approach_is_counted_within_the_forecast_cap(self):
        assert battles_to_reach(1000, 2999, 3000) == 381


class CurveTest(unittest.TestCase):

    def test_zero_damage_is_zero_percent(self):
        assert curve().percent_for(0) == 0.0

    def test_percent_interpolates_between_thresholds(self):
        self.assertAlmostEqual(curve().percent_for(2300), 75.0)

    def test_percent_caps_at_100(self):
        assert curve().percent_for(99999) == 100.0

    def test_damage_for_a_percent_inverts_the_percent_for_damage(self):
        threshold_curve = curve()

        for percent in (10.0, 65.0, 80.0, 99.0):
            self.assertAlmostEqual(threshold_curve.percent_for(threshold_curve.damage_for(percent)), percent)

    def test_damage_interpolates_between_thresholds(self):
        assert curve().damage_for(80.0) == 2450.0

    def test_no_damage_for_a_percent_above_100(self):
        assert curve().damage_for(101) is None

    def test_dense_curve_skips_garbage_and_falling_points(self):
        dense = ThresholdCurve.from_api(dense_api())

        assert dense.points == [(0.0, 0.0), (50.0, 1700.0), (65.0, 2000.0), (95.0, 3000.0)]

    def test_no_curve_without_thresholds(self):
        assert ThresholdCurve.from_api({'thresholds': {}}) is None

    def test_no_curve_without_a_response(self):
        assert ThresholdCurve.from_api(None) is None


class EstimatedCurveTest(unittest.TestCase):

    def test_passes_through_the_dossier_point(self):
        estimate = estimated_curve(3008, 82.91)

        assert abs(estimate.percent_for(3008) - 82.91) < 0.01

    def test_a_better_battle_raises_the_percent(self):
        estimate = estimated_curve(3008, 82.91)

        assert estimate.percent_for(project_moving_avg(3008, 4300)) > 82.91

    def test_the_marks_need_more_damage_in_order(self):
        estimate = estimated_curve(3008, 82.91)
        damages = [estimate.damage_for(level) for level in (65.0, 85.0, 95.0, 100.0)]

        assert damages == sorted(damages)
        assert damages[1] > 3008

    def test_a_projection_works_without_the_site(self):
        state = moe_state(3008, 82.91, 4300, estimated_curve(3008, 82.91))

        assert state['has_curve'] is True
        assert state['delta'] > 0
        assert state['next_level'] == 85

    def test_none_without_an_average(self):
        assert estimated_curve(0, 50.0) is None

    def test_none_without_a_percent(self):
        assert estimated_curve(2000, 0) is None


class NextLevelTest(unittest.TestCase):

    def test_first_level_from_a_low_percent(self):
        assert next_level(10.0, curve(), LEVELS) == 65.0

    def test_just_below_a_level_targets_it(self):
        assert next_level(94.99, curve(), LEVELS) == 95.0

    def test_none_after_the_last_level(self):
        assert next_level(95.0, curve(), LEVELS) is None


class StateTest(unittest.TestCase):

    def test_in_battle_state(self):
        state = moe_state(2500, 81.5, 2100, curve(), 3000, 0.5, 1)

        assert state['next_level'] == 85
        assert state['need'] == {65: 0, 85: 5450, 95: 30700, 100: 86250}
        assert state['need_next'] == 5450
        assert state['target_avg'] == {65: 2000, 85: 2600, 95: 3100, 100: 4200}
        assert state['projected'] == 81.24
        assert state['delta'] == -0.26
        assert state['ema_projected'] == 2492
        assert state['battles'] == 12
        assert state['step_need'] == 1158

    def test_reached_level_needs_nothing_and_the_projection_caps(self):
        state = moe_state(2550, 84.0, 90000, curve(), None, 1.0, 1)

        assert state['need_next'] == 0
        assert state['projected'] == 100.0
        assert state['battles'] == 0

    def test_hangar_state_projects_nothing(self):
        state = moe_state(2500, 81.5, None, curve(), 3000)

        assert state['delta'] == 0.0
        assert state['projected'] == 81.5
        assert state['ema_projected'] == 2500
        assert state['need'][85] == 7550
        assert state['battles'] == 12

    def test_state_without_a_curve(self):
        state = moe_state(2000, 70.0, 100, None, None)

        assert state['projected'] is None
        assert state['need'] == {}
        assert not state['has_curve']

    def test_battles_macro_without_a_curve_is_a_dash(self):
        values = moe_macros(moe_state(2000, 70.0, 100, None, None))

        assert values['battles'] == '-'

    def test_after_the_last_mark_only_100_percent_is_left(self):
        state = moe_state(3500, 96.0, 0, curve(), 5000)

        assert state['next_level'] is None
        assert state['need'][95] == 0
        assert state['need'][100] == 38850

    def test_missing_percent_is_taken_from_the_curve(self):
        state = moe_state(2300, None, 0, curve(), None)

        assert state['next_level'] == 85


class WholePercentTest(unittest.TestCase):

    def test_next_whole_percent_after_a_fraction(self):
        assert next_whole_percent(86.3) == 87

    def test_next_whole_percent_after_a_whole_percent(self):
        assert next_whole_percent(86.0) == 87

    def test_next_whole_percent_can_be_100(self):
        assert next_whole_percent(99.5) == 100

    def test_no_whole_percent_after_100(self):
        assert next_whole_percent(100.0) is None

    def test_damage_for_the_next_whole_percent_before_the_battle(self):
        state = moe_state(2500, 81.5, None, curve(), None)

        assert state['up_level'] == 82
        assert state['up_need'] == 3258

    def test_damage_for_the_next_whole_percent_shrinks_with_the_battle_damage(self):
        state = moe_state(2500, 81.5, 1000, curve(), None)

        assert state['up_need'] == 2258

    def test_that_damage_lifts_the_projection_to_the_whole_percent(self):
        state = moe_state(2500, 81.5, 3258, curve(), None)

        assert state['projected'] == 82.0
        assert state['up_need'] == 0

    def test_less_damage_stays_below_the_whole_percent(self):
        state = moe_state(2500, 81.5, 3208, curve(), None)

        assert state['projected'] == 81.97
        assert state['up_need'] == 50

    def test_no_whole_percent_at_100(self):
        state = moe_state(4300, 100.0, 0, curve(), None)

        assert state['up_level'] is None
        assert state['up_need'] is None

    def test_no_whole_percent_beyond_the_curve(self):
        state = moe_state(3200, 95.5, 0, curve_without_100(), None)

        assert state['up_level'] is None
        assert state['up_need'] is None

    def test_no_whole_percent_without_a_curve(self):
        state = moe_state(2000, 70.0, 0, None, None)

        assert state['up_need'] is None


class MacrosTest(unittest.TestCase):

    def test_whole_percent_macros(self):
        values = moe_macros(moe_state(2500, 81.5, 1000, curve(), None))

        assert values['up'] == '82'
        assert values['need_up'] == '2 258'

    def test_whole_percent_macros_without_a_curve(self):
        values = moe_macros(moe_state(2000, 70.0, 0, None, None))

        assert values['up'] == '-'
        assert values['need_up'] == '-'

    def test_text_values(self):
        values = moe_macros(moe_state(2500, 81.5, 2100, curve(), 1000, 0.5, 2))

        assert values['percent'] == '81.50'
        assert values['marks'] == '2'
        assert values['stars'] == u'★★'
        assert values['need65'] == u'✓'
        assert values['next'] == '85'
        assert values['target_next'] == '2 600'
        assert values['battles'] == u'∞'
        assert values['step'] == '0.5'
        assert values['delta'] == '-0.26'

    def test_a_rising_delta_carries_a_plus_sign(self):
        values = moe_macros(moe_state(2500, 81.5, 5000, curve(), None))

        assert values['delta'] == '+1.65'

    def test_battles_macro_without_a_pace_is_a_dash(self):
        values = moe_macros(moe_state(2500, 81.5, 2100, curve(), None))

        assert values['battles'] == '-'


class ColorTest(unittest.TestCase):

    def test_rising_delta_is_up_colored(self):
        state = moe_state(2500, 81.5, 5000, curve(), None)

        assert moe_color(state, 'delta') == COLOR_UP

    def test_falling_delta_is_down_colored(self):
        state = moe_state(2500, 81.5, 0, curve(), None)

        assert moe_color(state, 'delta') == COLOR_DOWN

    def test_hangar_delta_is_neutral(self):
        state = moe_state(2500, 81.5, None, curve(), None)

        assert moe_color(state, 'delta') == COLOR_NEUTRAL

    def test_coloring_off_is_neutral(self):
        state = moe_state(2500, 81.5, 5000, curve(), None)

        assert moe_color(state, 'off') == COLOR_NEUTRAL

    def test_mark_color_follows_the_mark_reached(self):
        state = moe_state(2500, 81.5, None, curve(), None)

        assert moe_color(state, 'mark') == MARK_COLORS[1]

    def test_mark_color_for_three_marks(self):
        state = moe_state(3500, 96.0, None, curve(), None)

        assert moe_color(state, 'mark') == MARK_COLORS[3]

    def test_mark_color_without_marks(self):
        state = moe_state(100, 10.0, None, None, None)

        assert moe_color(state, 'mark') == MARK_COLORS[0]


class BattleCombinedTest(unittest.TestCase):

    def test_reads_tank_arena_and_combined_damage(self):
        assert battle_combined(event(1, 10, 1000, 300, 500)) == (1, 10, 1500)

    def test_none_without_a_tank(self):
        assert battle_combined({'vehicle': {}}) is None

    def test_none_without_an_event(self):
        assert battle_combined(None) is None


class PaceTest(unittest.TestCase):

    def test_records_a_new_battle(self):
        book = PaceBook()

        assert book.record_event(event(1, 10, 1000, 300, 500))

    def test_ignores_a_battle_seen_before(self):
        book = PaceBook()
        book.record_event(event(1, 10, 1000, 300, 500))

        assert not book.record_event(event(1, 10, 1000))

    def test_no_pace_from_a_single_battle(self):
        book = PaceBook()
        book.record_event(event(1, 10, 1000, 300, 500))

        assert book.pace(1) is None

    def test_pace_is_the_average_combined_damage(self):
        book = book_with_three_battles()

        assert book.pace(1) == 6500 / 3.0

    def test_rejects_a_bad_tank_id(self):
        assert not PaceBook().record('x', 1, 5)

    def test_rejects_negative_damage(self):
        assert not PaceBook().record(1, 13, -1)

    def test_keeps_only_the_last_battles(self):
        book = book_filled_past_the_window()

        assert book.battles(7) == 20
        assert book.pace(7) == 14.5

    def test_round_trips_through_a_dict(self):
        again = PaceBook(book_filled_past_the_window().to_dict())

        assert again.pace(7) == 14.5

    def test_garbage_dict_loads_empty(self):
        assert PaceBook({'1': [['bad']], '2': 'x'}).tanks == {}


class ThresholdCacheTest(unittest.TestCase):

    def test_unknown_tank_is_due(self):
        assert ThresholdCache().due(1, 0)

    def test_pending_tank_is_not_due(self):
        cache = ThresholdCache()

        cache.begin(1)

        assert not cache.due(1, 0)

    def test_stored_curve_is_kept_until_the_ttl(self):
        cache = ThresholdCache()

        cache.store(1, curve(), 100)

        assert cache.get(1) is not None
        assert not cache.due(1, 100 + THRESHOLD_TTL_S - 1)
        assert cache.due(1, 100 + THRESHOLD_TTL_S)

    def test_failed_refresh_keeps_the_curve_for_the_error_ttl(self):
        cache = ThresholdCache()
        cache.store(1, curve(), 0)

        cache.store(1, None, THRESHOLD_TTL_S)

        assert cache.get(1) is not None
        assert not cache.due(1, THRESHOLD_TTL_S + THRESHOLD_ERROR_TTL_S - 1)
        assert cache.due(1, THRESHOLD_TTL_S + THRESHOLD_ERROR_TTL_S)

    def test_failed_first_fetch_retries_after_the_error_ttl(self):
        cache = ThresholdCache()

        cache.store(2, None, 0)

        assert cache.get(2) is None
        assert cache.due(2, THRESHOLD_ERROR_TTL_S)


if __name__ == '__main__':
    unittest.main()
