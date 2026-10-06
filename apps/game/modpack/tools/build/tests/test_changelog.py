# -*- coding: utf-8 -*-
"""CHANGELOG.md keeps the shape the server's parseChangelog and the manager's release notes read:
a bilingual `## <id> <version>` entry for every catalogued package and a `## <version>` one for the release."""
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import os
import re
import sys
import unittest

import _support  # noqa: F401

BUILD_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BUILD_DIR not in sys.path:
    sys.path.insert(0, BUILD_DIR)

import fileio  # noqa: E402
import layout  # noqa: E402

MODPACK_DIR = os.path.dirname(os.path.dirname(BUILD_DIR))
CHANGELOG = os.path.join(MODPACK_DIR, 'CHANGELOG.md')
CATALOG = os.path.join(MODPACK_DIR, 'catalog', 'catalog.json')
PACKAGE_JSON = os.path.join(MODPACK_DIR, 'package.json')
LANGUAGES = ('en', 'ru')
CYRILLIC = re.compile(u'[Ѐ-ӿ]')
HEADING = re.compile(r'^##\s+(?:(?P<id>[a-z][a-z0-9_]*)\s+)?v?(?P<version>\d+\.\d+\.\d+)\s*$')
LANGUAGE_HEADING = re.compile(r'^###\s+(?P<language>%s)\s*$' % '|'.join(LANGUAGES))


def entry_texts(lines):
    """{language: text} of one entry's `### ru` / `### en` sections; text outside them counts as no language."""
    sections = {}
    language = None
    for line in lines:
        match = LANGUAGE_HEADING.match(line)
        if match:
            language = match.group('language')
            sections.setdefault(language, [])
        else:
            sections.setdefault(language, []).append(line)
    sections.pop(None, None)
    texts = dict((key, '\n'.join(body).strip()) for key, body in sections.items())
    return dict((key, text) for key, text in texts.items() if text)


def parse_changelog(text):
    """{(component id or None, version): {language: text}} from `## <id> <version>` / `## <version>` headings."""
    entries = {}
    key = None
    lines = []
    for line in text.splitlines():
        match = HEADING.match(line)
        if match or line.startswith('## ') or line.startswith('# '):
            if key is not None:
                entries[key] = entry_texts(lines)
            key = (match.group('id'), match.group('version')) if match else None
            lines = []
        elif key is not None:
            lines.append(line)
    if key is not None:
        entries[key] = entry_texts(lines)
    return entries


def entry_name(key):
    component_id, version = key
    return '%s %s' % (component_id or 'modpack', version)


def is_translated(entry):
    russian = entry.get('ru', '')
    return russian != entry.get('en') and bool(CYRILLIC.search(russian))


class ChangelogTest(unittest.TestCase):

    def setUp(self):
        with io.open(CHANGELOG, encoding='utf-8') as handle:
            self.changelog = parse_changelog(handle.read())
        self.versions = dict((package.key, package.version) for package in layout.split_packages('root_init.py'))
        self.catalogued = [item['id'] for item in fileio.read_json(CATALOG)['components'] if 'kind' not in item]

    def test_every_catalogued_component_has_an_entry_for_its_version(self):
        keys = [(component_id, self.versions.get(component_id)) for component_id in self.catalogued]

        missing = ['%s %s' % key for key in keys if not self.changelog.get(key)]

        self.assertEqual(missing, [])

    def test_entries_name_only_known_components(self):
        component_keys = [key for key in self.changelog if key[0] is not None]

        unknown = sorted('%s %s' % key for key in component_keys if key[0] not in self.versions)

        self.assertEqual(unknown, [])

    def test_release_entry_for_the_modpack_version(self):
        version = fileio.read_json(PACKAGE_JSON)['version']

        self.assertTrue(self.changelog.get((None, version)))

    def test_every_entry_is_bilingual(self):
        incomplete = sorted(
            entry_name(key) for key, entry in self.changelog.items() if sorted(entry) != list(LANGUAGES)
        )

        self.assertEqual(incomplete, [])

    def test_russian_texts_are_translations(self):
        untranslated = sorted(entry_name(key) for key, entry in self.changelog.items() if not is_translated(entry))

        self.assertEqual(untranslated, [])

    def test_every_package_is_catalogued(self):
        self.assertEqual(sorted(self.versions), sorted(self.catalogued))
