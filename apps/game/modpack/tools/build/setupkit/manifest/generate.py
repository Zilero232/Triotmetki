"""Merges the package layout (ids, versions, files, dependencies) with the catalog (UI metadata).

Nothing the layout knows is repeated in the catalog: a component's id is its package key, its file name
comes from archive.file_name and its dependencies start with the package's own `depends`. Third-party
runtime mods (`kind: "dependency"`) have no package here: they are passed through as the catalog pins them.
A preset with `everything: true` (`all`, "All components") is appended to every component's presets, so a catalog
entry never lists it; required components are in every preset anyway.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import attr
import fnmatch
import os

import archive
import fileio
import layout

from .model import Component, Localized, Manifest, Preview

PREVIEWS_DIR = 'previews'


class ManifestError(ValueError):
    pass


def _uncatalogued_fields(package, catalog, warnings):
    """What a package with no catalog entry gets: its own name and description, unticked, in the fallback category."""
    warnings.append(
        'package %s has no catalog entry: shipped unticked in category %s' % (package.key, catalog.fallback_category),
    )
    return {
        'title': Localized(package.name, package.name),
        'description': Localized(package.description, package.description),
        'fair_play': catalog.fallback_fair_play,
        'category': catalog.fallback_category,
        'presets': (),
        'required': False,
        'preview': Preview(),
        'extra_dependencies': (),
        'perf': None,
        'context': None,
        'generator': None,
    }


def _catalogued_fields(package, entry):
    image = '%s/%s.png' % (PREVIEWS_DIR, package.key) if entry.preview.image else None
    audio = audio_path(package.key, entry.preview.audio) if entry.preview.audio else None
    return {
        'title': entry.title,
        'description': entry.description,
        'fair_play': entry.fair_play,
        'category': entry.category,
        'presets': entry.presets,
        'required': entry.required,
        'preview': Preview(image, entry.preview.video, audio),
        'extra_dependencies': entry.dependencies,
        'perf': entry.perf,
        'context': entry.context,
        'generator': entry.generator,
    }


def _dependency_keys(package, extra_dependencies):
    """The package's own dependencies, then the catalog's extra ones, each once."""
    keys = []
    for dependency in [depend.key for depend in package.depends] + list(extra_dependencies):
        if dependency not in keys:
            keys.append(dependency)
    return tuple(keys)


def _file_stats(file_name, packages_dir):
    """(sha256, size) of the built package file, or (None, None) when no packages folder is given."""
    if packages_dir is None:
        return None, None
    path = os.path.join(packages_dir, file_name)
    if not os.path.isfile(path):
        raise ManifestError(
            '%s not found in %s: build the packages first (tools/build/build.py)' % (file_name, packages_dir),
        )
    return fileio.sha256(path), os.path.getsize(path)


def _component(package, catalog, platform, packages_dir, warnings):
    entry = catalog.entry(package.key)
    is_catalogued = entry is not None
    fields = _catalogued_fields(package, entry) if is_catalogued else _uncatalogued_fields(package, catalog, warnings)
    required = fields['required']
    all_presets = tuple(preset.id for preset in catalog.presets)
    everything = tuple(preset.id for preset in catalog.presets if preset.everything)
    presets = all_presets if required else tuple(fields['presets']) + everything

    file_name = archive.file_name(package, platform)
    sha256, size = _file_stats(file_name, packages_dir)
    return Component(
        id=package.key,
        package_id=package.package_id,
        version=package.version,
        file=file_name,
        category=fields['category'],
        title=fields['title'],
        description=fields['description'],
        fair_play=fields['fair_play'],
        required=required,
        default=required or catalog.default_preset in fields['presets'],
        presets=presets,
        preview=fields['preview'],
        dependencies=_dependency_keys(package, fields['extra_dependencies']),
        catalogued=is_catalogued,
        sha256=sha256,
        size=size,
        perf=fields['perf'],
        context=fields['context'],
        generator=fields['generator'],
    )


def audio_path(key, source):
    """previews/<id>.<ext>: the component's sound, copied next to components.json (setupkit.audio)."""
    return '%s/%s%s' % (PREVIEWS_DIR, key, os.path.splitext(source)[1].lower())


def preview_hashes(manifest, out_dir):
    """{file: sha256} of every preview image and sound written under out_dir; the manager verifies each download."""
    hashes = {}
    for component in manifest.components:
        for preview in (component.preview.image, component.preview.audio):
            path = os.path.join(out_dir, *preview.split('/')) if preview else None
            if path and os.path.isfile(path):
                hashes[preview] = fileio.sha256(path)
    return hashes


def build_manifest(packages, catalog, platform='lesta', packages_dir=None, strict=False):
    """packages: layout.split_packages(); returns (Manifest, warnings). strict turns warnings into errors."""
    warnings = []
    components = [_component(package, catalog, platform, packages_dir, warnings) for package in packages]
    keys = set(component.id for component in components)
    for entry in catalog.components:
        if entry.id not in keys:
            warnings.append('catalog entry %s has no package (not built by this layout)' % entry.id)
    problems = _component_problems(components, catalog, keys)
    dependencies = _dependencies(catalog, keys, warnings)
    if strict:
        problems.extend(warnings)
    if problems:
        raise ManifestError('\n'.join(problems))

    components.sort(key=_catalog_order(catalog))
    used = set(component.category for component in components)
    manifest = Manifest(
        modpack_version=layout.modpack_version(),
        platform=platform,
        extension=archive.EXTENSIONS[platform],
        categories=tuple(category for category in catalog.categories if category.id in used),
        presets=catalog.presets,
        components=tuple(components),
        owned_patterns=catalog.owned_patterns,
        dependencies=dependencies,
        owned_paths=catalog.owned_paths,
        conflicts=_conflicts(catalog, keys),
        disabled_looks=catalog.disabled_looks,
    )
    return manifest, warnings


def _component_problems(components, catalog, keys):
    problems = []
    for component in components:
        missing = [dependency for dependency in component.dependencies if dependency not in keys]
        if missing:
            problems.append('%s depends on %s, which this build does not ship' % (component.id, ', '.join(missing)))
        if not any(fnmatch.fnmatch(component.file, pattern) for pattern in catalog.owned_patterns):
            problems.append('%s matches no ownedPatterns mask: uninstall would not recognise it' % component.file)
    return problems


def _catalog_order(catalog):
    """Sort key: category order, then the catalog's component order (uncatalogued last), then the id."""
    category_order = {category.id: index for index, category in enumerate(catalog.categories)}
    catalog_order = {entry.id: index for index, entry in enumerate(catalog.components)}

    def key(component):
        position = catalog_order.get(component.id, len(catalog_order))
        return category_order[component.category], position, component.id
    return key


def _conflicts(catalog, keys):
    """The conflict rules, each with only the components this build ships; a rule left with none is dropped."""
    rules = []
    for rule in catalog.conflicts:
        components = tuple(component_id for component_id in rule.components if component_id in keys)
        if components:
            rules.append(attr.evolve(rule, components=components))
    return tuple(rules)


def _dependencies(catalog, keys, warnings):
    """The catalog's third-party runtime mods, passed through; requiredBy keeps only the components this build ships."""
    shipped = []
    for dependency in catalog.dependencies:
        required_by = tuple(component_id for component_id in dependency.required_by if component_id in keys)
        left_out = ', '.join(component_id for component_id in dependency.required_by if component_id not in keys)
        if left_out:
            message = 'dependency %s is required by %s, which this build does not ship'
            warnings.append(message % (dependency.id, left_out))
        if required_by:
            shipped.append(attr.evolve(dependency, required_by=required_by))
    return tuple(shipped)
