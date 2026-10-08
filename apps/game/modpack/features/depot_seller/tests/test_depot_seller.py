# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.settings import Settings
from otmetki.features.depot_seller.i18n import STRINGS
from otmetki.features.depot_seller.model import (
    REFUSE_NOTHING,
    REFUSE_UNSET,
    build_page,
    confirm_text,
    is_confirmed,
    plan,
    sale_token,
    sell_action,
)
from otmetki.features.depot_seller.settings import DEFAULTS, SCHEMA, SETTINGS


def translate(key, **params):
    return STRINGS['ru'][key].format(**params)


def item(cd, kind='modules', count=1, price=1000, **flags):
    base = {'cd': cd, 'type_id': 3, 'kind': kind, 'name': 'item %d' % cd, 'count': count, 'price': price}
    base.update(flags)
    return base


def member(inv_id, **fields):
    base = {
        'inv_id': inv_id,
        'name': 'crew %d' % inv_id,
        'role': 'gunner',
        'role_level': 75,
        'skills': 0,
        'skill_progress': 0,
        'free_xp': 0,
        'premium': False,
        'female': False,
        'unique': False,
        'special': False,
        'locked': False,
    }
    base.update(fields)
    return base


def dismissed(crew):
    sale = plan([], crew, chosen(dismiss_crew=True))[0]
    if sale is None:
        return []
    return [entry['inv_id'] for entry in sale['crew']]


def chosen(**values):
    return Settings(values, SCHEMA).to_dict()


class DefaultsTest(unittest.TestCase):

    def test_every_flag_is_off(self):
        assert not any(DEFAULTS.values())

    def test_nothing_is_on_sale_by_default(self):
        assert plan([item(1)], [member(1)], chosen()) == (None, REFUSE_UNSET)

    def test_the_component_switch_is_hangar_depot_seller(self):
        assert SETTINGS == ('hangar_depot_seller',)

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


class PlanTest(unittest.TestCase):

    def test_only_the_switched_on_kinds_go_on_sale(self):
        sale, refusal = plan([item(1), item(2, kind='shells')], [], chosen(sell_shells=True))

        assert refusal is None
        assert [entry['cd'] for entry in sale['items']] == [2]

    def test_items_that_fit_an_own_vehicle_stay_unless_widened(self):
        items = [item(1, fits=True), item(2)]

        assert [entry['cd'] for entry in plan(items, [], chosen(sell_modules=True))[0]['items']] == [2]
        widened = plan(items, [], chosen(sell_modules=True, include_fitting=True))[0]
        assert sorted(entry['cd'] for entry in widened['items']) == [1, 2]

    def test_special_items_stay_unless_widened(self):
        items = [item(1, kind='equipment', special=True)]

        assert plan(items, [], chosen(sell_equipment=True)) == (None, REFUSE_NOTHING)
        assert plan(items, [], chosen(sell_equipment=True, include_special=True))[0]['items']

    def test_items_the_game_does_not_sell_never_go(self):
        items = [item(1, for_sale=False)]

        assert plan(items, [], chosen(sell_modules=True, include_fitting=True, include_special=True)) == (
            None,
            REFUSE_NOTHING,
        )

    def test_credits_add_up_every_copy(self):
        sale = plan([item(1, count=3, price=500), item(2, price=4000)], [], chosen(sell_modules=True))[0]

        assert sale['credits'] == 5500
        assert [entry['cd'] for entry in sale['items']] == [2, 1]

    def test_an_untrained_reserve_tankman_is_dismissed(self):
        assert dismissed([member(1)]) == [1]

    def test_a_tankman_with_a_full_role_level_stays(self):
        assert dismissed([member(1, role_level=100)]) == []

    def test_a_tankman_with_an_earned_skill_stays(self):
        assert dismissed([member(1, skills=1)]) == []

    def test_a_tankman_with_a_skill_in_progress_stays(self):
        assert dismissed([member(1, skill_progress=12)]) == []

    def test_a_tankman_with_free_xp_stays(self):
        assert dismissed([member(1, free_xp=300)]) == []

    def test_premium_crew_stays(self):
        assert dismissed([member(1, premium=True)]) == []

    def test_female_crew_stays(self):
        assert dismissed([member(1, female=True)]) == []

    def test_unique_crew_stays(self):
        assert dismissed([member(1, unique=True)]) == []

    def test_special_crew_stays(self):
        assert dismissed([member(1, special=True)]) == []

    def test_a_tankman_the_read_could_not_check_stays(self):
        assert dismissed([{'inv_id': 1, 'name': 'crew 1', 'role_level': 50}]) == []

    def test_broken_rows_are_dropped(self):
        items = [None, {'kind': 'modules', 'cd': 0, 'count': 1}, item(3, count=0), {'kind': 'tanks', 'cd': 1}]

        assert plan(items, [None, {'inv_id': 'x'}], chosen(sell_modules=True, dismiss_crew=True)) == (
            None,
            REFUSE_NOTHING,
        )


class ConfirmationTest(unittest.TestCase):

    def test_the_confirmation_names_the_items_the_crew_and_the_credits(self):
        values = chosen(sell_modules=True, dismiss_crew=True)
        sale = plan([item(1, count=2, price=1500)], [member(1), member(2)], values)[0]

        text = confirm_text(sale, translate)

        assert text == u'Продать за 3 000 кредитов: 2× item 1, демобилизовать 2 танкистов (crew 1, crew 2)?'

    def test_a_long_list_ends_with_how_many_more(self):
        items = [item(cd, price=1000 + cd) for cd in range(1, 10)]
        sale = plan(items, [], chosen(sell_modules=True))[0]

        assert confirm_text(sale, translate).endswith(u'и ещё 3?')

    def test_the_same_stock_has_the_same_token(self):
        values = chosen(sell_modules=True)

        assert sale_token(plan([item(1)], [], values)[0]) == sale_token(plan([item(1)], [], values)[0])

    def test_the_token_changes_with_the_stock(self):
        values = chosen(sell_modules=True)

        assert sale_token(plan([item(1)], [], values)[0]) != sale_token(plan([item(1, count=2)], [], values)[0])

    def test_the_token_changes_with_the_price(self):
        values = chosen(sell_modules=True)

        assert sale_token(plan([item(1)], [], values)[0]) != sale_token(plan([item(1, price=900)], [], values)[0])

    def test_the_token_changes_with_the_crew(self):
        values = chosen(sell_modules=True, dismiss_crew=True)

        first = sale_token(plan([item(1)], [member(5)], values)[0])

        assert first != sale_token(plan([item(1)], [member(6)], values)[0])

    def test_nothing_on_sale_has_no_token(self):
        assert sale_token(None) is None

    def test_the_confirmed_sale_is_the_one_the_dialog_listed(self):
        values = chosen(sell_modules=True)
        listed = plan([item(1)], [], values)[0]

        assert is_confirmed(sell_action(listed), plan([item(1)], [], values)[0])

    def test_a_sale_that_changed_under_the_dialog_is_not_confirmed(self):
        values = chosen(sell_modules=True)
        listed = plan([item(1)], [], values)[0]

        assert not is_confirmed(sell_action(listed), plan([item(1), item(2)], [], values)[0])


class PageTest(unittest.TestCase):

    def test_the_page_lists_items_then_crew(self):
        values = chosen(sell_modules=True, include_fitting=True, dismiss_crew=True)
        sale = plan([item(1, fits=True)], [member(7)], values)[0]

        rows = build_page(sale, None, translate)['rows']

        assert [row['id'] for row in rows] == ['item:1', 'crew:7']
        assert rows[0]['badge'] == u'Подходит к машине'

    def test_an_empty_page_says_why(self):
        assert build_page(None, REFUSE_UNSET, translate)['empty'].startswith(u'Включите')


if __name__ == '__main__':
    unittest.main()
