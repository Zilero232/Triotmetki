from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.settings import Settings
from otmetki.features.auto_reserves.i18n import STRINGS
from otmetki.features.auto_reserves.model import (
    CHECK_EVERY_S,
    REFUSE_FULL,
    REFUSE_NOTHING,
    REFUSE_UNSET,
    free_slots,
    is_due,
    is_slot_freed,
    pick,
    wanted_kinds,
)
from otmetki.features.auto_reserves.model.opt_in import clean_state, is_opted_in, migrated, with_choice
from otmetki.features.auto_reserves.settings import DEFAULTS, SCHEMA, SETTINGS


def booster(booster_id, kind='credits', active=False, ready=True, value=50, expires=0):
    return {'id': booster_id, 'kind': kind, 'active': active, 'ready': ready, 'value': value, 'expires': expires}


def chosen(**values):
    return Settings(values, SCHEMA).to_dict()


class DefaultsTest(unittest.TestCase):

    def test_no_reserve_is_picked_by_default(self):
        assert wanted_kinds(chosen()) == []
        assert DEFAULTS['when'] == 'session'

    def test_nothing_is_activated_by_default(self):
        assert pick([booster(1)], chosen()) == ([], REFUSE_UNSET)

    def test_the_component_switch_is_hangar_auto_reserves(self):
        assert SETTINGS == ('hangar_auto_reserves',)

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


class PickTest(unittest.TestCase):

    def test_the_strongest_ready_reserve_of_a_picked_kind_goes_on(self):
        boosters = [booster(1, value=50), booster(2, value=100), booster(3, kind='xp', value=300)]

        assert pick(boosters, chosen(reserve_credits=True)) == ([2], None)

    def test_among_equals_the_one_that_expires_first_goes_on(self):
        boosters = [booster(1, expires=0), booster(2, expires=2000), booster(3, expires=1000)]

        assert pick(boosters, chosen(reserve_credits=True)) == ([3], None)

    def test_a_kind_already_on_is_left_alone(self):
        boosters = [booster(1, active=True, ready=False), booster(2)]

        assert pick(boosters, chosen(reserve_credits=True)) == ([], REFUSE_NOTHING)

    def test_reserves_not_ready_are_skipped(self):
        assert pick([booster(1, ready=False)], chosen(reserve_credits=True)) == ([], REFUSE_NOTHING)

    def test_no_more_than_the_free_slots(self):
        boosters = [
            booster(1, kind='xp', active=True, ready=False),
            booster(2, kind='free_xp', active=True, ready=False),
            booster(3, kind='credits'),
            booster(4, kind='crew_xp'),
        ]

        assert pick(boosters, chosen(reserve_credits=True, reserve_crew_xp=True)) == ([3], None)

    def test_every_slot_taken_is_refused_as_full(self):
        active = [booster(index, kind='xp', active=True, ready=False) for index in (1, 2, 3)]

        assert pick(active + [booster(9)], chosen(reserve_credits=True)) == ([], REFUSE_FULL)

    def test_broken_rows_are_dropped(self):
        rows = [None, {'id': 'x', 'kind': 'credits'}, {'id': 1, 'kind': 'gold'}, booster(True)]

        assert pick(rows, chosen(reserve_credits=True)) == ([], REFUSE_NOTHING)


class SlotsTest(unittest.TestCase):

    def test_an_active_reserve_of_a_kind_not_tracked_takes_a_slot(self):
        boosters = [booster(1, kind=None, active=True), booster(2, kind='xp', active=True), booster(3)]

        assert free_slots(boosters) == 1

    def test_a_reserve_of_a_kind_not_tracked_fills_the_last_slot(self):
        boosters = [booster(1, kind=None, active=True), booster(2, kind=None, active=True)]
        boosters.append(booster(3, kind='xp', active=True))

        assert pick(boosters + [booster(9)], chosen(reserve_credits=True)) == ([], REFUSE_FULL)

    def test_a_slot_freed_since_the_refusal_is_seen(self):
        assert is_slot_freed([booster(1, active=True)], 1)

    def test_no_slot_freed_since_the_refusal(self):
        assert not is_slot_freed([booster(1, active=True), booster(2, active=True)], 1)

    def test_nothing_refused_is_never_a_freed_slot(self):
        assert not is_slot_freed([], None)


class OptInTest(unittest.TestCase):

    def test_a_broken_file_is_an_empty_state(self):
        assert clean_state('x') == {'accounts': [], 'migrated': False}

    def test_only_integer_account_ids_are_kept(self):
        state = clean_state({'accounts': [3, 'x', True, 3, 1], 'migrated': True})

        assert state == {'accounts': [1, 3], 'migrated': True}

    def test_a_choice_adds_the_account(self):
        state = with_choice(clean_state(None), 5, True)

        assert is_opted_in(state, 5)

    def test_a_choice_off_drops_only_that_account(self):
        state = {'accounts': [1, 5], 'migrated': True}

        assert with_choice(state, 5, False)['accounts'] == [1]

    def test_the_switch_on_before_the_update_opts_in_the_first_account(self):
        state = migrated(clean_state(None), 7, True)

        assert state == {'accounts': [7], 'migrated': True}

    def test_the_switch_off_before_the_update_opts_in_nobody(self):
        state = migrated(clean_state(None), 7, False)

        assert state == {'accounts': [], 'migrated': True}

    def test_the_migration_runs_once(self):
        state = migrated({'accounts': [7], 'migrated': True}, 8, True)

        assert state['accounts'] == [7]


class DueTest(unittest.TestCase):

    def test_the_first_hangar_of_the_session_is_due(self):
        assert is_due(chosen(), 100.0, 0.0, False)

    def test_after_the_session_start_only_the_expiry_mode_looks_again(self):
        assert not is_due(chosen(), 1000.0, 0.0, True)
        assert is_due(chosen(when='expiry'), CHECK_EVERY_S, 0.0, True)
        assert not is_due(chosen(when='expiry'), CHECK_EVERY_S - 1, 0.0, True)


if __name__ == '__main__':
    unittest.main()
