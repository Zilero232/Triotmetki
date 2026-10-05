"""Reads and checks catalog/catalog.json.

catalog/catalog.schema.json (JSON Schema, Draft 7) checks the shape: types, required and unknown fields, id,
version and package id patterns, texts without control characters (they are shown by the manager), https links,
hashes. This module then checks what a schema cannot: preview files on disk, ids that refer to each other, presets
and the third-party masks. Every problem is collected, then reported at once as a
CatalogError. Entries with `kind: "dependency"` are third-party runtime mods, passed through to components.json.
jsonschema is a dev dependency (uv sync); on a bare Python the shape check is skipped and only the rest runs.
"""
import fnmatch
import io
import json
import os

from .. import SCHEMA_PATH
from .model import (
    DEPENDENCY_KIND,
    Author,
    Catalog,
    CatalogEntry,
    Category,
    ConflictRule,
    Dependency,
    Licence,
    Localized,
    Preset,
    Preview,
)

try:
    import jsonschema
except ImportError:
    jsonschema = None

HAVE_SCHEMA = jsonschema is not None
# Audio previews are the sounds a component already ships, so they are read from the modpack's assets/ folder.
AUDIO_DIR = 'assets'
DEPENDENCY_EXTENSION = '.mtmod'


class CatalogError(ValueError):

    def __init__(self, problems):
        self.problems = list(problems)
        super(CatalogError, self).__init__('catalog.json:\n  ' + '\n  '.join(self.problems))


def schema_problems(raw):
    """`path: message` for every place catalog.json breaks catalog.schema.json; [] without jsonschema."""
    if jsonschema is None:
        return []
    with io.open(SCHEMA_PATH, encoding='utf-8') as handle:
        validator = jsonschema.Draft7Validator(json.load(handle))
    errors = sorted(validator.iter_errors(raw), key=lambda error: list(map(str, error.absolute_path)))
    return ['%s: %s' % ('/'.join(map(str, error.absolute_path)) or '(root)', error.message) for error in errors]


def _localized(value):
    return Localized(value['ru'], value['en'])


class _Reader(object):

    def __init__(self, assets_dir):
        self.assets_dir = assets_dir
        self.problems = []

    def fail(self, where, message):
        self.problems.append('%s: %s' % (where, message))

    def preview(self, where, value):
        if value is None:
            return Preview()
        image = value.get('image')
        audio = value.get('audio')
        if image is not None and not os.path.isfile(os.path.join(self.assets_dir, image)):
            self.fail(where, 'preview image %s not found in catalog/' % image)
        if audio is not None and not os.path.isfile(self.audio_path(audio)):
            self.fail(where, 'preview audio %s not found in assets/' % audio)
        return Preview(image, value.get('video'), audio)

    def audio_path(self, audio):
        return os.path.join(os.path.dirname(os.path.abspath(self.assets_dir)), AUDIO_DIR, *str(audio).split('/'))

    def entry(self, raw):
        return CatalogEntry(
            id=raw['id'],
            category=raw['category'],
            title=_localized(raw['title']),
            description=_localized(raw['description']),
            fair_play=_localized(raw['fairPlay']),
            presets=tuple(raw.get('presets', ())),
            required=raw.get('required', False),
            preview=self.preview('components.%s.preview' % raw['id'], raw.get('preview')),
            dependencies=tuple(raw.get('dependencies', ())),
            perf=raw['perf'],
            context=raw['context'],
        )


def _conflict(raw):
    return ConflictRule(
        raw['id'],
        _localized(raw['title']),
        tuple(raw['patterns']),
        tuple(raw['components']),
        _localized(raw['note']),
    )


def _category(raw):
    return Category(raw['id'], _localized(raw['title']), _localized(raw['description']))


def _preset(raw):
    return Preset(raw['id'], _localized(raw['title']), _localized(raw['description']), raw.get('custom', False))


def _dependency(raw):
    author = raw['author']
    licence = raw['licence']
    return Dependency(
        id=raw['id'],
        kind=DEPENDENCY_KIND,
        package_id=raw['packageId'],
        version=raw['version'],
        file=raw['file'],
        title=_localized(raw['title']),
        description=_localized(raw['description']),
        author=Author(author['name'], author['url']),
        licence=Licence(licence['name'], licence['url'], licence['sha256']),
        source_url=raw['sourceUrl'],
        sha256=raw['sha256'],
        size=raw['size'],
        required_by=tuple(raw['requiredBy']),
        optional=raw['optional'],
        restart_required=raw['restartRequired'],
    )


def _unique(reader, where, ids):
    seen = set()
    for item in ids:
        if item in seen:
            reader.fail(where, 'duplicate id %s' % item)
        seen.add(item)


def parse(raw, assets_dir):
    problems = schema_problems(raw)
    if problems:
        raise CatalogError(problems)
    reader = _Reader(assets_dir)
    components = raw['components']
    catalog = Catalog(
        categories=tuple(_category(item) for item in raw['categories']),
        presets=tuple(_preset(item) for item in raw['presets']),
        components=tuple(reader.entry(item) for item in components if 'kind' not in item),
        owned_patterns=tuple(raw['ownedPatterns']),
        fallback_category=raw['fallbackCategory'],
        fallback_fair_play=_localized(raw['fallbackFairPlay']),
        dependencies=tuple(_dependency(item) for item in components if 'kind' in item),
        owned_paths=tuple(raw.get('ownedPaths', ())),
        conflicts=tuple(_conflict(item) for item in raw.get('conflicts', ())),
    )
    _check(reader, catalog)
    if reader.problems:
        raise CatalogError(reader.problems)
    return catalog


def _check(reader, catalog):
    category_ids = [category.id for category in catalog.categories]
    entry_ids = [entry.id for entry in catalog.components]
    _unique(reader, 'categories', category_ids)
    _unique(reader, 'presets', [preset.id for preset in catalog.presets])
    _unique(reader, 'components', entry_ids + [dependency.id for dependency in catalog.dependencies])
    _check_presets(reader, catalog.presets)
    if catalog.fallback_category not in category_ids:
        reader.fail('fallbackCategory', 'unknown category %r' % catalog.fallback_category)
    for entry in catalog.components:
        _check_entry(reader, catalog, entry)
    for dependency in catalog.dependencies:
        _check_dependency(reader, catalog, entry_ids, dependency)
    _unique(reader, 'conflicts', [rule.id for rule in catalog.conflicts])
    for rule in catalog.conflicts:
        _check_conflict(reader, catalog, entry_ids, rule)


def _check_presets(reader, presets):
    custom = [preset.id for preset in presets if preset.custom]
    if len(custom) != 1 or not presets or not presets[-1].custom:
        reader.fail('presets', 'exactly one preset must be custom, and it must come last')
    elif presets[0].custom:
        reader.fail('presets', 'the first preset is the default one and cannot be custom')


def _check_entry(reader, catalog, entry):
    where = 'components.%s' % entry.id
    category_ids = [category.id for category in catalog.categories]
    preset_ids = [preset.id for preset in catalog.presets]
    custom = [preset.id for preset in catalog.presets if preset.custom]
    entry_ids = [component.id for component in catalog.components]
    if entry.category not in category_ids:
        reader.fail(where, 'unknown category %r' % entry.category)
    for preset in entry.presets:
        if preset not in preset_ids or preset in custom:
            reader.fail(where, 'unknown or custom preset %r' % preset)
    if entry.required and entry.presets:
        reader.fail(where, 'a required component is in every preset; drop its presets list')
    for dependency in entry.dependencies:
        if dependency not in entry_ids or dependency == entry.id:
            reader.fail(where, 'unknown dependency %r' % dependency)


def _check_conflict(reader, catalog, entry_ids, rule):
    where = 'conflicts.%s' % rule.id
    for component_id in rule.components:
        if component_id not in entry_ids:
            reader.fail(where, 'unknown component %r' % component_id)
    for pattern in rule.patterns:
        if any(pattern.startswith(prefix.lower()) for prefix in our_prefixes(catalog.owned_patterns)):
            reader.fail(where, '%r names our own packages' % pattern)


def our_prefixes(owned_patterns):
    """The package id prefixes of our packages: `net.triotmetki.*.mtmod` -> `net.triotmetki.`."""
    return tuple(sorted(set(pattern.split('*', 1)[0] for pattern in owned_patterns if '*' in pattern)))


def _check_dependency(reader, catalog, entry_ids, dependency):
    where = 'components.%s' % dependency.id
    package_id = dependency.package_id.lower()
    if any(package_id.startswith(prefix.lower()) for prefix in our_prefixes(catalog.owned_patterns)):
        reader.fail(where, 'packageId %s is ours: a dependency is a third-party mod' % dependency.package_id)
    if any(fnmatch.fnmatch(dependency.file.lower(), pattern.lower()) for pattern in catalog.owned_patterns):
        reader.fail(where, 'file %s matches ownedPatterns: uninstall would take it for ours' % dependency.file)
    expected = '%s_%s%s' % (dependency.package_id, dependency.version, DEPENDENCY_EXTENSION)
    if dependency.file != expected:
        reader.fail(where, 'file must be %s, got %s' % (expected, dependency.file))
    for component_id in dependency.required_by:
        if component_id not in entry_ids:
            reader.fail(where, 'requiredBy: unknown component %r' % component_id)


def load(path, assets_dir):
    with io.open(path, encoding='utf-8') as handle:
        return parse(json.load(handle), assets_dir)
