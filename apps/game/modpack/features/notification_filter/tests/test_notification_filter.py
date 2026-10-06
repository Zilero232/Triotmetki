from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.settings import Settings
from otmetki.features.notification_filter.i18n import STRINGS
from otmetki.features.notification_filter.model import hidden_names, hides, type_table_of
from otmetki.features.notification_filter.settings import SCHEMA, SETTINGS

AUCTION_DECORATOR = 'IntegratedAuctionStageStartDecorator'


class NOTIFICATION_TYPE(object):
    UNDEFINED = 0
    MESSAGE = 1
    INVITE = 2
    FRIENDSHIP_RQ = 3
    NOTIFY_CENTER_POP_UP = 4
    CLAN_INVITES = 5
    RECRUIT_REMINDER = 13
    AUCTION_STAGE_START = 19
    TRADING_CARAVAN_REFILL = 19
    WOT_PLUS_INTRO = 22
    RANGE = None


TYPES = type_table_of(NOTIFICATION_TYPE)


def default_values():
    return Settings(None, SCHEMA).to_dict()


def everything_hidden():
    return {key: True for key in SCHEMA.defaults}


def hidden_types(values, class_name='NotificationDecorator'):
    names = hidden_names(values)
    return frozenset(type_id for type_id in set(TYPES.values()) if hides(type_id, class_name, names, TYPES))


class TypeTableTest(unittest.TestCase):

    def test_the_table_maps_a_name_to_its_number(self):
        assert TYPES['MESSAGE'] == 1

    def test_the_table_leaves_out_non_numbers(self):
        assert 'RANGE' not in TYPES


class HidesTest(unittest.TestCase):

    def test_the_defaults_hide_the_promo_only(self):
        assert hidden_types(default_values(), AUCTION_DECORATOR) == frozenset([4, 19, 22])

    def test_the_auction_behind_a_shared_number_is_hidden(self):
        assert hides(19, AUCTION_DECORATOR, hidden_names(default_values()), TYPES)

    def test_the_trading_caravan_behind_the_same_number_stays(self):
        assert not hides(19, 'TradingCaravanRefillDecorator', hidden_names(default_values()), TYPES)

    def test_an_unknown_class_behind_a_shared_number_stays(self):
        assert not hides(19, 'SomeFutureDecorator', hidden_names(default_values()), TYPES)

    def test_each_group_hides_its_types(self):
        values = Settings(
            {'hide_promo': False, 'hide_reminders': True, 'hide_friend_requests': True, 'hide_clan': True},
            SCHEMA,
        ).to_dict()

        assert hidden_types(values) == frozenset([13, 3, 5])

    def test_plain_messages_invites_and_undefined_stay(self):
        hidden = hidden_types(everything_hidden(), AUCTION_DECORATOR)

        assert 1 not in hidden
        assert 2 not in hidden
        assert 0 not in hidden

    def test_a_type_the_client_does_not_have_stays(self):
        assert not hides(4, 'Decorator', hidden_names(everything_hidden()), {})


class SettingsTest(unittest.TestCase):

    def test_the_component_switch_is_hangar_notification_filter(self):
        assert SETTINGS == ('hangar_notification_filter',)

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


if __name__ == '__main__':
    unittest.main()
