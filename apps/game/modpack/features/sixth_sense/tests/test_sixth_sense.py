# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import itertools
import json
import os
import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.sixth_sense.i18n import STRINGS
from otmetki.features.sixth_sense.model import SixthSense, format_sixth_sense, icon_gallery, icon_path, set_icon_path
from otmetki.features.sixth_sense.model.preview import preview_text
from otmetki.features.sixth_sense.settings import SCHEMA
from otmetki.features.sixth_sense.settings.constants import COLORS, ICON_SETS

ASSETS_DIR = os.path.join(_support.MODPACK_DIR, 'assets')
SHIPPED_ICON_SETS = ICON_SETS
DEFAULT_LAMP = '<img src="img://gui/maps/icons/otmetki/sixth_sense/icons/lamp_64.png" width="56" height="56"/>'


def shipped_files():
    with io.open(os.path.join(ASSETS_DIR, 'assets.json'), encoding='utf-8') as handle:
        sets = json.load(handle)['sets']

    paths = set()
    for item in sets:
        target = item['target'][len('res/'):]
        for name in os.listdir(os.path.join(ASSETS_DIR, *item['files'].split('/'))):
            paths.add(target + '/' + name)
    return paths


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def settings_with(**values):
    return Settings(values, SCHEMA)


def lamp_lit_at(moment):
    lamp = SixthSense()
    lamp.observed(True, moment)
    return lamp


def lamp_put_out():
    lamp = lamp_lit_at(10.0)
    lamp.observed(False, 14.0)
    return lamp


class LampTest(unittest.TestCase):

    def test_detection_lights_the_lamp(self):
        lamp = SixthSense()

        change = lamp.observed(True, 10.0)

        assert change == 'show'

    def test_a_repeated_detection_changes_nothing(self):
        lamp = lamp_lit_at(10.0)

        change = lamp.observed(True, 11.0)

        assert change is None

    def test_the_countdown_reads_the_whole_seconds_still_left(self):
        lamp = lamp_lit_at(10.0)

        seconds = lamp.countdown(13.7)

        assert seconds == 7

    def test_losing_the_detection_hides_the_lamp(self):
        lamp = lamp_lit_at(10.0)

        change = lamp.observed(False, 14.0)

        assert change == 'hide'

    def test_losing_the_detection_again_changes_nothing(self):
        lamp = lamp_put_out()

        change = lamp.observed(False, 15.0)

        assert change is None

    def test_a_lamp_that_is_out_has_no_countdown(self):
        lamp = lamp_put_out()

        seconds = lamp.countdown(15.0)

        assert seconds is None

    def test_a_new_detection_lights_the_lamp_again(self):
        lamp = lamp_put_out()

        change = lamp.observed(True, 20.0)

        assert change == 'show'

    def test_reset_puts_the_lamp_out(self):
        lamp = lamp_lit_at(20.0)

        lamp.reset()

        assert not lamp.lit


class ExpiryTest(unittest.TestCase):

    def test_the_lamp_stays_while_the_countdown_runs(self):
        lamp = lamp_lit_at(10.0)

        is_expired = lamp.expired(19.9)

        assert not is_expired

    def test_the_lamp_goes_out_when_the_countdown_reaches_zero(self):
        lamp = lamp_lit_at(10.0)

        is_expired = lamp.expired(20.0)

        assert is_expired

    def test_the_vehicle_shortens_the_countdown(self):
        lamp = SixthSense()
        lamp.observed(True, 10.0, 8.5)

        is_expired = lamp.expired(18.5)

        assert is_expired

    def test_a_lamp_that_is_out_never_expires(self):
        lamp = lamp_put_out()

        is_expired = lamp.expired(100.0)

        assert not is_expired

    def test_the_last_second_reads_one_never_zero(self):
        lamp = lamp_lit_at(10.0)

        seconds = lamp.countdown(19.6)

        assert seconds == 1
        assert not lamp.expired(19.6)

    def test_an_expired_lamp_waits_for_a_new_detection(self):
        lamp = lamp_lit_at(10.0)

        change = lamp.observed(True, 25.0)

        assert change is None
        assert lamp.expired(25.0)


class FormatTest(unittest.TestCase):

    def test_the_own_caption_shows_next_to_the_icon(self):
        settings = settings_with(text='SPOTTED')

        text = format_sixth_sense(lamp_lit_at(100.0), settings, translator(), 104.2)

        assert 'SPOTTED' in text
        assert 'lamp_' in text

    def test_the_timer_counts_down_the_seconds_left(self):
        settings = settings_with()

        text = format_sixth_sense(lamp_lit_at(100.0), settings, translator(), 104.2)

        assert '6 с' in text

    def test_the_timer_starts_at_the_full_lamp_time(self):
        settings = settings_with()

        text = format_sixth_sense(lamp_lit_at(100.0), settings, translator(), 100.0)

        assert '10 с' in text

    def test_the_custom_icon_set_is_gone(self):
        settings = settings_with(icon_set='custom', icon='gui/maps/icons/otmetki/lamp.png')

        assert settings.get('icon_set') == 'lamp'
        assert settings.get('icon') == ''

    def test_the_shipped_lamp_is_the_default_icon(self):
        settings = settings_with(show_timer=False)

        text = format_sixth_sense(lamp_lit_at(100.0), settings, translator(), 100.2)

        assert text == DEFAULT_LAMP

    def test_the_second_half_second_shows_the_dimmed_frame(self):
        settings = settings_with(show_timer=False)

        text = format_sixth_sense(lamp_lit_at(100.0), settings, translator(), 100.7)

        assert 'lamp_dim_64.png' in text

    def test_the_next_second_shows_the_bright_frame_again(self):
        settings = settings_with(show_timer=False)

        text = format_sixth_sense(lamp_lit_at(100.0), settings, translator(), 101.1)

        assert 'lamp_64.png' in text

    def test_without_the_pulse_the_icon_never_dims(self):
        settings = settings_with(pulse=False)

        path = icon_path(settings, True)

        assert path == 'gui/maps/icons/otmetki/sixth_sense/icons/lamp_64.png'

    def test_a_larger_size_picks_the_larger_rendition(self):
        assert set_icon_path('lamp', 100) == 'gui/maps/icons/otmetki/sixth_sense/icons/lamp_128.png'

    def test_preview_draws_something(self):
        text = preview_text(settings_with(), translator('en'))

        assert text


class SettingsTest(unittest.TestCase):

    def test_an_invalid_color_falls_back_to_the_default(self):
        settings = settings_with(color='red')

        assert settings.get('color') == '#F2B25B'

    def test_a_colour_outside_the_swatches_falls_back_to_the_default(self):
        settings = settings_with(color='#123456')

        assert settings.get('color') == '#F2B25B'

    def test_a_swatch_colour_is_kept_in_any_case(self):
        settings = settings_with(color='#40c8ff')

        assert settings.get('color') == '#40C8FF'

    def test_the_retired_options_are_fixed(self):
        settings = settings_with(hide_after_s=9, icon_size=100)

        assert (settings.get('hide_after_s'), settings.get('icon_size')) == (0, 56)
        assert 'hide_after_s' not in SCHEMA.defaults


class StringsTest(unittest.TestCase):

    def test_both_languages_have_the_same_keys(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])

    def test_every_icon_set_has_a_label(self):
        for value in ICON_SETS:
            assert 'sixth_sense_icon_set_' + value in STRINGS['en'], value

    def test_every_colour_has_a_label(self):
        for value in COLORS:
            assert 'sixth_sense_color_' + value in STRINGS['en'], value


class ShippedAssetsTest(unittest.TestCase):

    def test_every_icon_ships_with_its_dimmed_frame(self):
        shipped = shipped_files()

        for icon_set, size, dimmed in itertools.product(SHIPPED_ICON_SETS, (32, 100), (False, True)):
            path = set_icon_path(icon_set, size, dimmed)
            assert path in shipped, path

    def test_the_gallery_shows_a_shipped_icon_of_every_set(self):
        shipped = shipped_files()
        pictures = icon_gallery(ICON_SETS)['icon_set']

        for icon_set in SHIPPED_ICON_SETS:
            assert pictures[icon_set].startswith('img://'), icon_set
            assert pictures[icon_set][len('img://'):] in shipped, icon_set

    def test_the_gallery_shows_the_larger_rendition(self):
        assert icon_gallery(('lamp',))['icon_set']['lamp'].endswith('/lamp_128.png')


if __name__ == '__main__':
    unittest.main()
