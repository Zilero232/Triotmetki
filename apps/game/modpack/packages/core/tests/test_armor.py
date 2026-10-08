from __future__ import absolute_import, division, print_function, unicode_literals

import math
import unittest

import _support  # noqa: F401
from otmetki.core.armor import (
    Plate,
    Shell,
    first_main,
    is_overmatched,
    needed_power,
    normalization,
    penetration_armor,
    plate_from,
    plates_along,
    power_at,
    ricochets,
    roll_chance,
    trace,
    up_to_main,
    verdict,
)


class Material(object):

    def __init__(self, armor, **flags):
        self.armor = armor
        self.vehicleDamageFactor = flags.get('vehicleDamageFactor', 1.0)
        self.useHitAngle = flags.get('useHitAngle', True)
        self.mayRicochet = flags.get('mayRicochet', True)
        self.collideOnceOnly = flags.get('collideOnceOnly', False)
        self.checkCaliberForRichet = flags.get('checkCaliberForRichet', True)
        self.checkCaliberForHitAngleNorm = flags.get('checkCaliberForHitAngleNorm', True)


def cos_of(degrees):
    return math.cos(math.radians(degrees))


def plate(armor, angle=0.0, distance=1.0, part='hull', spaced=False, **flags):
    return Plate(
        distance=distance, hit_cos=cos_of(angle), part=part, material_kind=1, armor=armor, is_spaced=spaced, **flags
    )


def shell(kind='ARMOR_PIERCING', caliber=100.0, near=200.0, far=180.0, **extra):
    return Shell(kind=kind, caliber=caliber, power_near=near, power_far=far, max_distance=720.0, **extra)


class PlateFromTest(unittest.TestCase):

    def test_reads_the_armour_of_the_material(self):
        found = plate_from((2.0, 0.5, 7, 1), Material(80))

        assert found.armor == 80.0

    def test_names_the_part_by_its_collision_index(self):
        found = plate_from((2.0, 0.5, 7, 2), Material(80))

        assert found.part == 'turret'

    def test_an_index_past_the_four_parts_is_a_track(self):
        found = plate_from((2.0, 0.5, 7, 6), Material(20, vehicleDamageFactor=0.0))

        assert found.kind == 'track'

    def test_a_material_without_damage_factor_is_a_screen(self):
        found = plate_from((2.0, 0.5, 7, 1), Material(10, vehicleDamageFactor=0.0))

        assert found.kind == 'spaced'

    def test_a_spaced_gun_is_the_gun(self):
        found = plate_from((2.0, 0.5, 7, 3), Material(30, vehicleDamageFactor=0.0))

        assert found.kind == 'gun'

    def test_a_material_without_armour_is_no_plate(self):
        assert plate_from((2.0, 0.5, 7, 1), None) is None

    def test_a_back_face_counts_its_angle_from_the_normal(self):
        found = plate_from((2.0, -0.5, 7, 1), Material(80))

        assert found.hit_cos == 0.5


class PlatesAlongTest(unittest.TestCase):

    def test_orders_the_hits_nearest_first(self):
        hits = [(3.0, 1.0, 2, 1), (1.0, 1.0, 1, 1)]

        found = plates_along(hits, lambda part, kind: Material(kind * 10))

        assert [item.armor for item in found] == [10.0, 20.0]

    def test_counts_a_collide_once_material_once_per_part(self):
        hits = [(1.0, 1.0, 1, 0), (2.0, 1.0, 1, 0)]

        found = plates_along(hits, lambda part, kind: Material(20, collideOnceOnly=True, vehicleDamageFactor=0.0))

        assert len(found) == 1

    def test_leaves_out_hits_without_a_material(self):
        hits = [(1.0, 1.0, 1, 1), (2.0, 1.0, 2, 1)]

        found = plates_along(hits, lambda part, kind: Material(50) if kind == 2 else None)

        assert len(found) == 1

    def test_up_to_main_stops_at_the_first_main_plate(self):
        plates = [plate(10, spaced=True), plate(100), plate(40)]

        assert len(up_to_main(plates)) == 2

    def test_first_main_is_none_without_one(self):
        assert first_main([plate(10, spaced=True)]) is None


class EffectiveTest(unittest.TestCase):

    def test_effective_is_nominal_over_the_cosine(self):
        assert round(plate(100, angle=60).effective, 1) == 200.0

    def test_a_plate_that_ignores_the_angle_keeps_its_nominal(self):
        assert plate(100, angle=60, uses_angle=False).effective == 100

    def test_a_grazing_plate_is_capped(self):
        assert plate(100, angle=89.999).effective == 999


class PowerTest(unittest.TestCase):

    def test_holds_the_100_m_value_to_100_m(self):
        assert power_at(shell(), 50.0) == 200.0

    def test_falls_linearly_to_the_500_m_value(self):
        assert power_at(shell(), 300.0) == 190.0

    def test_is_nothing_past_the_range(self):
        assert power_at(shell(), 800.0) == 0.0

    def test_takes_the_shell_distance_factor(self):
        assert power_at(shell(), 50.0, 0.5) == 100.0


class RicochetTest(unittest.TestCase):

    def test_ap_ricochets_past_70_degrees(self):
        assert ricochets(plate(100, angle=71), shell()) is True

    def test_ap_does_not_ricochet_under_70_degrees(self):
        assert ricochets(plate(100, angle=69), shell()) is False

    def test_three_calibres_over_the_plate_never_ricochet(self):
        assert ricochets(plate(30, angle=80), shell(caliber=100.0)) is False

    def test_the_overmatch_is_named(self):
        assert is_overmatched(plate(30), shell(caliber=100.0)) is True

    def test_heat_ricochets_only_past_85_degrees(self):
        assert ricochets(plate(100, angle=84), shell(kind='HOLLOW_CHARGE')) is False

    def test_heat_ignores_the_calibre_rule(self):
        assert ricochets(plate(10, angle=86), shell(kind='HOLLOW_CHARGE', caliber=120.0)) is True

    def test_apfsds_ricochets_only_past_80_degrees(self):
        assert ricochets(plate(100, angle=75), shell(kind='ARMOR_PIERCING_FSDS')) is False

    def test_aphe_never_ricochets(self):
        assert ricochets(plate(100, angle=85), shell(kind='ARMOR_PIERCING_HE')) is False

    def test_a_material_that_may_not_ricochet_does_not(self):
        assert ricochets(plate(100, angle=80, may_ricochet=False), shell()) is False


class NormalizationTest(unittest.TestCase):

    def test_ap_turns_five_degrees(self):
        assert normalization(plate(100), shell(caliber=100.0)) == 5.0

    def test_apcr_turns_two_degrees(self):
        assert normalization(plate(100), shell(kind='ARMOR_PIERCING_CR', caliber=100.0)) == 2.0

    def test_heat_does_not_turn(self):
        assert normalization(plate(100), shell(kind='HOLLOW_CHARGE')) == 0.0

    def test_two_calibres_widen_it(self):
        assert normalization(plate(40), shell(caliber=100.0)) == 5.0 * 1.4 * 100.0 / 80.0

    def test_penetration_armour_takes_the_normalised_angle(self):
        found = penetration_armor(plate(100, angle=65), shell(caliber=100.0))

        assert round(found, 1) == round(100 / cos_of(60), 1)

    def test_a_turn_past_the_normal_leaves_the_nominal(self):
        assert penetration_armor(plate(100, angle=3), shell(caliber=100.0)) == 100.0


class TraceTest(unittest.TestCase):

    def test_one_main_plate_needs_its_penetration_armour(self):
        found = trace([plate(100)], shell())

        assert found.needed == 100.0

    def test_a_screen_adds_its_armour(self):
        found = trace([plate(20, spaced=True), plate(100, distance=1.5)], shell())

        assert found.needed == 120.0

    def test_a_ricochet_off_a_screen_ends_the_way(self):
        found = trace([plate(20, angle=75, spaced=True), plate(100)], shell(caliber=50.0))

        assert found.outcome == 'ricochet'

    def test_a_heat_jet_loses_half_per_metre_after_a_screen(self):
        plates = [plate(10, spaced=True, distance=1.0), plate(100, distance=2.01)]

        found = trace(plates, shell(kind='HOLLOW_CHARGE'))

        assert round(found.needed, 3) == 210.0

    def test_a_heat_jet_does_not_ricochet_after_a_screen(self):
        plates = [plate(10, spaced=True, distance=1.0), plate(100, angle=87, distance=1.2)]

        found = trace(plates, shell(kind='HOLLOW_CHARGE'))

        assert found.outcome == 'main'

    def test_modern_he_spends_three_times_a_screen(self):
        plates = [plate(10, spaced=True), plate(50, distance=1.5)]

        found = trace(plates, shell(kind='HIGH_EXPLOSIVE', is_modern_he=True, passes_screens=True))

        assert found.needed == 80.0

    def test_modern_he_without_screen_penetration_stops_on_a_screen(self):
        plates = [plate(10, spaced=True), plate(50, distance=1.5)]

        found = trace(plates, shell(kind='HIGH_EXPLOSIVE', is_modern_he=True))

        assert found.outcome == 'stopped'

    def test_screens_alone_have_no_main_plate(self):
        found = trace([plate(10, spaced=True)], shell())

        assert found.outcome == 'no_main'

    def test_an_unknown_shell_kind_meets_nothing(self):
        found = trace([plate(100)], shell(kind='SMOKE'))

        assert found.outcome == 'no_main'

    def test_a_lost_jet_needs_infinite_penetration(self):
        plates = [plate(10, spaced=True, distance=1.0), plate(100, distance=4.0)]

        found = trace(plates, shell(kind='HOLLOW_CHARGE'))

        assert found.needed == float('inf')

    def test_needed_power_of_no_steps_is_nothing(self):
        assert needed_power(()) == 0.0


class VerdictTest(unittest.TestCase):

    def test_a_thin_plate_is_always_penetrated(self):
        assert verdict(trace([plate(100)], shell()), 200.0).name == 'always'

    def test_a_thick_plate_is_never_penetrated(self):
        assert verdict(trace([plate(300)], shell()), 200.0).name == 'never'

    def test_a_plate_inside_the_band_is_a_chance(self):
        assert verdict(trace([plate(200)], shell()), 200.0).name == 'chance'

    def test_an_even_match_is_half_a_chance(self):
        assert round(verdict(trace([plate(200)], shell()), 200.0).chance, 3) == 0.5

    def test_a_ricochet_never_penetrates(self):
        assert verdict(trace([plate(100, angle=80)], shell()), 300.0).name == 'ricochet'

    def test_no_main_plate_is_no_armour(self):
        assert verdict(trace([plate(10, spaced=True)], shell()), 300.0).name == 'no_armour'

    def test_the_roll_chance_falls_with_the_threshold(self):
        assert roll_chance(1.1) < roll_chance(0.9)

    def test_the_roll_reaches_past_the_band_never(self):
        assert roll_chance(1.3) == 0.0


if __name__ == '__main__':
    unittest.main()
