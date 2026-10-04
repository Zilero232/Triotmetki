# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.update_notice.i18n import STRINGS
from otmetki.features.update_notice.model import (
    clean_release,
    find_update,
    format_hangar,
    game_folder,
    installed_packages,
    is_shown,
    notes_line,
    version_key,
)
from otmetki.features.update_notice.model.widget import hangar_widget
from otmetki.features.update_notice.settings import SCHEMA, SETTINGS

SPLIT_INSTALL = [
    'net.triotmetki.core_0.4.0.mtmod',
    'otmetki.companion_0.9.1.mtmod',
    'net.triotmetki.hangar_tweaks_0.2.0.mtmod',
    'readme.txt',
    'net.openwg.gameface_1.2.2.mtmod',
]


def answer(version='0.1.9', status='compatible', files=None, notes=None):
    packages = [{'id': 'x', 'file': name} for name in (files or ['net.triotmetki.hangar_tweaks_0.3.0.mtmod'])]
    default_notes = {'ru': u'## Что нового\n- Продажа со склада', 'en': u'- Depot seller'}
    release = {'version': version, 'notes': notes or default_notes}
    release['packages'] = packages
    return {'status': status, 'release': release}


def translator(language='ru'):
    return _support.translator(STRINGS, language)


class InstalledTest(unittest.TestCase):

    def test_only_our_packages_are_read(self):
        assert installed_packages(SPLIT_INSTALL) == {
            'net.triotmetki.core': '0.4.0',
            'otmetki.companion': '0.9.1',
            'net.triotmetki.hangar_tweaks': '0.2.0',
        }

    def test_the_single_package_carries_the_modpack_version(self):
        assert installed_packages(['otmetki.0.1.8.mtmod']) == {'otmetki': '0.1.8'}

    def test_the_newest_copy_of_a_package_wins(self):
        names = ['net.triotmetki.core_0.10.0.mtmod', 'net.triotmetki.core_0.9.0.mtmod']

        assert installed_packages(names) == {'net.triotmetki.core': '0.10.0'}

    def test_the_newest_client_folder_is_the_running_one(self):
        assert game_folder(['1.44.1.0', 'configs', '1.45.0.0', '1.9.0.0']) == '1.45.0.0'
        assert game_folder(['configs']) is None


class UpdateTest(unittest.TestCase):

    def test_a_newer_copy_of_an_installed_package_is_an_update(self):
        update = find_update(clean_release(answer()), installed_packages(SPLIT_INSTALL))

        assert update['version'] == '0.1.9'
        assert update['outdated'] == 1

    def test_the_same_files_are_no_update(self):
        release = clean_release(answer(files=['net.triotmetki.hangar_tweaks_0.2.0.mtmod']))

        assert find_update(release, installed_packages(SPLIT_INSTALL)) is None

    def test_a_package_that_is_not_installed_is_no_update(self):
        release = clean_release(answer(files=['net.triotmetki.depot_seller_0.1.0.mtmod']))

        assert find_update(release, installed_packages(SPLIT_INSTALL)) is None

    def test_an_older_single_package_is_an_update(self):
        update = find_update(clean_release(answer()), installed_packages(['otmetki.0.1.8.mtmod']))

        assert update['outdated'] == 1

    def test_a_release_for_another_client_is_ignored(self):
        assert clean_release(answer(status='waiting')) is None
        assert clean_release({'status': 'compatible', 'release': None}) is None
        assert clean_release(None) is None

    def test_versions_compare_as_numbers(self):
        assert version_key('0.10.0') > version_key('0.9.9')
        assert version_key('1.2.3-beta') == (1, 2, 3)
        assert version_key('x') is None


class NoticeTest(unittest.TestCase):

    def update(self):
        return find_update(clean_release(answer()), installed_packages(SPLIT_INSTALL))

    def test_a_skipped_version_is_not_shown(self):
        assert not is_shown(self.update(), '0.1.9')
        assert is_shown(self.update(), '0.1.8')
        assert not is_shown(None, None)

    def test_the_notes_line_skips_markdown_headers(self):
        assert notes_line(self.update(), 'ru') == u'Что нового'
        assert notes_line(self.update(), 'en') == u'Depot seller'

    def test_the_card_names_the_version(self):
        text = format_hangar(self.update(), Settings(None, SCHEMA), translator())

        assert u'Доступна версия 0.1.9' in text

    def test_the_widget_shows_the_version_as_its_value(self):
        assert hangar_widget(self.update(), translator('en'))['data']['value'] == '0.1.9'


class SettingsTest(unittest.TestCase):

    def test_the_component_switch_is_hangar_update_notice(self):
        assert SETTINGS == ('hangar_update_notice',)

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


class FixedSettingsTest(unittest.TestCase):

    def test_the_font_size_is_fixed(self):
        assert 'font_size' not in SCHEMA.defaults
        assert Settings({'font_size': 30}, SCHEMA).get('font_size') == 14


if __name__ == '__main__':
    unittest.main()
