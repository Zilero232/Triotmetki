from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.settings import Settings
from otmetki.features.responsive_reticle.i18n import STRINGS
from otmetki.features.responsive_reticle.model import (
    Stillness,
    TickBlend,
    TickGate,
    argument_names,
    blend,
    frame_time_diff,
    nearly_same,
    realm_of,
    relax_time,
    server_tick,
    skip_reason,
    supports_rotate,
    turn_time,
    turned,
)
from otmetki.features.responsive_reticle.settings import SCHEMA, SETTINGS
from otmetki.features.responsive_reticle.settings.constants import CHOICES


class Rotator(object):

    def lesta_rotate(self, shotPoint, timeDiff):
        return shotPoint, timeDiff

    def other_rotate(self, shotPoint, timeDiff, gunIndex):
        return gunIndex


class RealmTest(unittest.TestCase):

    def test_the_ru_realm_is_lesta(self):
        assert realm_of('RU') == 'lesta'

    def test_any_other_realm_is_wg(self):
        assert realm_of('EU') == 'wg'

    def test_an_unknown_realm_is_wg(self):
        assert realm_of(None) == 'wg'


class RotateSignatureTest(unittest.TestCase):

    def test_the_names_after_self_are_read_from_a_method(self):
        assert argument_names(Rotator.lesta_rotate) == ('shotPoint', 'timeDiff')

    def test_the_lesta_signature_is_supported_on_lesta(self):
        assert supports_rotate(argument_names(Rotator.lesta_rotate), 'lesta')

    def test_the_known_signature_is_expected_on_wg(self):
        assert supports_rotate(('shotPoint', 'timeDiff'), 'wg')

    def test_another_signature_keeps_the_component_off(self):
        assert not supports_rotate(argument_names(Rotator.other_rotate), 'lesta')

    def test_something_that_is_not_a_function_has_no_names(self):
        assert argument_names(None) == ()


class SkipTest(unittest.TestCase):

    def test_a_replay_is_skipped(self):
        assert skip_reason(True, (), None) == 'replay'

    def test_an_spg_is_skipped(self):
        assert skip_reason(False, frozenset(['SPG']), None) == 'artillery'

    def test_a_gun_without_traverse_is_skipped(self):
        assert skip_reason(False, (), 0.0) == 'fixed yaw'

    def test_a_tank_in_a_battle_runs(self):
        assert skip_reason(False, frozenset(['mediumTank']), None) is None


class FrameTest(unittest.TestCase):

    def test_the_server_tick_is_the_tenth_of_a_second(self):
        assert server_tick(12.34) == 123

    def test_no_clock_has_no_tick(self):
        assert server_tick(None) is None

    def test_a_frame_turns_by_the_time_since_the_last_turn(self):
        assert abs(frame_time_diff(10.016, 10.0) - 0.016) < 1e-9

    def test_a_frame_right_after_the_last_turn_is_skipped(self):
        assert frame_time_diff(10.0, 10.0) is None

    def test_a_long_pause_is_capped_like_the_stock_rotator(self):
        assert frame_time_diff(12.0, 10.0) == 0.2

    def test_a_rotator_that_never_turned_is_left_to_the_stock_tick(self):
        assert frame_time_diff(10.0, None) is None

    def test_the_instant_marker_lands_at_once_like_the_stock_replay_warp(self):
        assert relax_time('instant', 0.007) == 0.001

    def test_the_smooth_marker_relaxes_over_half_a_tick(self):
        assert relax_time('smooth', 0.007) == 0.05

    def test_a_long_frame_relaxes_the_smooth_marker_over_the_frame(self):
        assert relax_time('smooth', 0.08) == 0.08

    def test_the_instant_turn_glides_the_gun_over_the_frame(self):
        assert turn_time('instant', 0.007) == 0.007

    def test_the_smooth_turn_glides_the_gun_with_the_marker(self):
        assert turn_time('smooth', 0.007) == 0.05


class BlendTest(unittest.TestCase):

    def test_halfway_is_the_middle(self):
        assert blend([0.0, 2.0], [1.0, 4.0], 0.5) == [0.5, 3.0]

    def test_past_the_end_is_the_target(self):
        assert blend([0.0], [1.0], 3.0) == [1.0]

    def test_without_a_start_it_is_the_target(self):
        assert blend(None, [1.0], 0.5) == [1.0]

    def test_a_value_of_another_shape_is_the_target(self):
        assert blend([0.0], [1.0, 2.0], 0.5) == [1.0, 2.0]


class TickBlendTest(unittest.TestCase):

    def test_the_value_is_computed_once_per_tick(self):
        cache = TickBlend()
        calls = []

        for at in (10.0, 10.02, 10.05):
            cache.get(at, lambda: calls.append(1) or [1.0])

        assert len(calls) == 1

    def test_the_first_tick_hands_out_its_value(self):
        assert TickBlend().get(10.0, lambda: [1.0]) == [1.0]

    def test_the_next_tick_glides_from_the_last_value(self):
        cache = TickBlend()
        cache.get(10.05, lambda: [1.0])

        assert cache.get(10.15, lambda: [3.0]) == [1.0]

    def test_halfway_through_the_tick_is_halfway_there(self):
        cache = TickBlend()
        cache.get(10.05, lambda: [1.0])
        cache.get(10.15, lambda: [3.0])

        assert abs(cache.get(10.2, lambda: [9.0])[0] - 2.0) < 1e-9

    def test_a_tick_after_a_gap_starts_at_its_value(self):
        cache = TickBlend()
        cache.get(10.0, lambda: [1.0])

        assert cache.get(10.5, lambda: [3.0]) == [3.0]

    def test_a_cleared_cache_computes_again(self):
        cache = TickBlend()
        cache.get(10.0, lambda: [1.0])
        cache.clear()

        assert cache.get(10.01, lambda: [2.0]) == [2.0]

    def test_without_a_clock_it_computes_every_time(self):
        assert TickBlend().get(None, lambda: [2.0]) == [2.0]


class StillnessTest(unittest.TestCase):

    def test_the_first_frame_is_not_still(self):
        assert not Stillness().still((1.0, 2.0))

    def test_the_same_aim_after_a_turn_that_moved_nothing_is_still(self):
        stillness = Stillness()
        stillness.still((1.0, 2.0))
        stillness.turned(False)

        assert stillness.still((1.0, 2.0))

    def test_the_same_aim_while_the_gun_still_turns_is_not_still(self):
        stillness = Stillness()
        stillness.still((1.0, 2.0))
        stillness.turned(True)

        assert not stillness.still((1.0, 2.0))

    def test_a_moved_aim_is_not_still(self):
        stillness = Stillness()
        stillness.still((1.0, 2.0))
        stillness.turned(False)

        assert not stillness.still((1.0, 2.1))

    def test_a_cleared_stillness_is_not_idle(self):
        stillness = Stillness()
        stillness.still((1.0,))
        stillness.turned(False)
        stillness.still((1.0,))
        stillness.clear()

        assert not stillness.idle


class NearlySameTest(unittest.TestCase):

    def test_a_difference_below_the_threshold_is_the_same(self):
        assert nearly_same((1.0, 2.0), (1.000001, 2.0))

    def test_a_difference_above_the_threshold_is_not(self):
        assert not nearly_same((1.0,), (1.001,))

    def test_another_length_is_not_the_same(self):
        assert not nearly_same((1.0,), (1.0, 2.0))

    def test_nothing_to_compare_is_not_the_same(self):
        assert not nearly_same(None, (1.0,))

    def test_a_gun_that_kept_its_angles_did_not_turn(self):
        assert not turned((0.5, 0.1), (0.5, 0.1))

    def test_a_gun_that_changed_its_yaw_turned(self):
        assert turned((0.5, 0.1), (0.5001, 0.1))


class TickGateTest(unittest.TestCase):

    def test_the_first_call_of_a_tick_goes_through(self):
        assert TickGate().allow('client', 7)

    def test_a_second_call_in_the_same_tick_is_held(self):
        gate = TickGate()
        gate.allow('client', 7)

        assert not gate.allow('client', 7)

    def test_each_marker_has_its_own_gate(self):
        gate = TickGate()
        gate.allow('client', 7)

        assert gate.allow('dual_acc', 7)

    def test_the_next_tick_goes_through_again(self):
        gate = TickGate()
        gate.allow('client', 7)

        assert gate.allow('client', 8)


class SettingsTest(unittest.TestCase):

    def test_the_switch_is_battle_responsive_reticle(self):
        assert SETTINGS == ('battle_responsive_reticle',)

    def test_the_marker_follows_at_once_by_default(self):
        assert Settings({}, SCHEMA).get('follow') == 'instant'

    def test_every_follow_mode_has_a_label(self):
        for mode in CHOICES['follow']:
            assert 'responsive_reticle_follow_' + mode in STRINGS['en']

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


if __name__ == '__main__':
    unittest.main()
