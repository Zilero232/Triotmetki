# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.settings import Settings
from otmetki.features.hangar_cleaner.i18n import STRINGS
from otmetki.features.hangar_cleaner.model import (
    EVENT_ENTRIES,
    OFFER_BANNERS,
    TEASER,
    client_major_minor,
    hides,
    private_overrides_allowed,
)
from otmetki.features.hangar_cleaner.settings import SCHEMA, SETTINGS


def default_values():
    return Settings(None, SCHEMA).to_dict()


def everything_hidden():
    return {key: True for key in SCHEMA.defaults}


class HidesTest(unittest.TestCase):

    def test_the_teaser_is_hidden_by_default(self):
        assert hides(TEASER, default_values(), True)

    def test_the_offer_banners_are_hidden_by_default(self):
        assert hides(OFFER_BANNERS, default_values(), True)

    def test_the_event_entries_stay_by_default(self):
        assert not hides(EVENT_ENTRIES, default_values(), True)

    def test_the_switch_off_shows_everything(self):
        for element in (TEASER, OFFER_BANNERS, EVENT_ENTRIES):
            assert not hides(element, everything_hidden(), False), element

    def test_an_unknown_element_is_never_hidden(self):
        assert not hides('unknown', everything_hidden(), True)


class ClientVersionTest(unittest.TestCase):

    def test_the_version_is_read_from_the_client_text(self):
        assert client_major_minor(u'Мир танков 1.45.0.5231') == (1, 45)

    def test_a_verified_client_allows_the_private_overrides(self):
        assert private_overrides_allowed('v.1.45.1.0 #1234')

    def test_another_client_does_not(self):
        assert not private_overrides_allowed('1.46.0.0')

    def test_an_empty_version_does_not(self):
        assert not private_overrides_allowed('')

    def test_an_unknown_version_does_not(self):
        assert not private_overrides_allowed(None)


class SettingsTest(unittest.TestCase):

    def test_the_component_switch_is_hangar_cleaner(self):
        assert SETTINGS == ('hangar_cleaner',)

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


if __name__ == '__main__':
    unittest.main()
