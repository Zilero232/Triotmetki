"""The components manifest model: the hand-written catalog (input) and components.json (output).

components.json is camelCase JSON for the modpack manager; the catalog uses
the same spelling. Frozen attrs classes (the tooling runs on Python 2.7, which has no dataclasses).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import attr

SCHEMA_VERSION = 1
DEPENDENCY_KIND = 'dependency'


@attr.s(frozen=True)
class Localized(object):
    ru = attr.ib()
    en = attr.ib()


@attr.s(frozen=True)
class Category(object):
    id = attr.ib()
    title = attr.ib()
    description = attr.ib()


@attr.s(frozen=True)
class Preset(object):
    id = attr.ib()
    title = attr.ib()
    description = attr.ib()
    custom = attr.ib(default=False)
    everything = attr.ib(default=False)


@attr.s(frozen=True)
class Preview(object):
    """In the catalog `image` is relative to catalog/ and `audio` to assets/;
    in the manifest both to the manifest's folder."""
    image = attr.ib(default=None)
    video = attr.ib(default=None)
    audio = attr.ib(default=None)


@attr.s(frozen=True)
class CatalogEntry(object):
    """UI metadata of one package key; `dependencies` adds to the package's own (core, companion)."""
    id = attr.ib()
    category = attr.ib()
    title = attr.ib()
    description = attr.ib()
    fair_play = attr.ib()
    presets = attr.ib(default=())
    required = attr.ib(default=False)
    preview = attr.ib(default=Preview())
    dependencies = attr.ib(default=())
    perf = attr.ib(default=None)
    context = attr.ib(default=None)
    generator = attr.ib(default=None)


@attr.s(frozen=True)
class ConflictRule(object):
    """Third-party mods that duplicate some of our components: `patterns` are case-insensitive masks over a package's
    file name and its meta.xml id; the manager warns when one is installed next to an enabled component it lists."""
    id = attr.ib()
    title = attr.ib()
    patterns = attr.ib()
    components = attr.ib()
    note = attr.ib()


@attr.s(frozen=True)
class Author(object):
    name = attr.ib()
    url = attr.ib()


@attr.s(frozen=True)
class Licence(object):
    name = attr.ib()
    url = attr.ib()
    sha256 = attr.ib()


@attr.s(frozen=True)
class Dependency(object):
    """A third-party runtime mod (`kind: "dependency"`): not our package, passed through to components.json as is.

    The manager downloads `source_url` only when the player has no copy, checks `sha256` and `size`, keeps the
    licence text from `licence.url` (checked by `licence.sha256`) and ticks it when a `required_by` id is selected. An
    `optional` one only improves them (ModsList): switching a component on never installs it.
    """
    id = attr.ib()
    kind = attr.ib()
    package_id = attr.ib()
    version = attr.ib()
    file = attr.ib()
    title = attr.ib()
    description = attr.ib()
    author = attr.ib()
    licence = attr.ib()
    source_url = attr.ib()
    sha256 = attr.ib()
    size = attr.ib()
    required_by = attr.ib()
    optional = attr.ib()
    restart_required = attr.ib()


@attr.s(frozen=True)
class Catalog(object):
    categories = attr.ib()
    presets = attr.ib()
    components = attr.ib()
    owned_patterns = attr.ib()
    fallback_category = attr.ib()
    fallback_fair_play = attr.ib()
    dependencies = attr.ib(default=())
    owned_paths = attr.ib(default=())
    conflicts = attr.ib(default=())
    disabled_looks = attr.ib(default=())

    def entry(self, key):
        return next((entry for entry in self.components if entry.id == key), None)

    @property
    def default_preset(self):
        return self.presets[0].id


@attr.s(frozen=True)
class Component(object):
    id = attr.ib()
    package_id = attr.ib()
    version = attr.ib()
    file = attr.ib()
    category = attr.ib()
    title = attr.ib()
    description = attr.ib()
    fair_play = attr.ib()
    required = attr.ib()
    default = attr.ib()
    presets = attr.ib()
    preview = attr.ib()
    dependencies = attr.ib()
    catalogued = attr.ib()
    sha256 = attr.ib(default=None)
    size = attr.ib(default=None)
    perf = attr.ib(default=None)
    context = attr.ib(default=None)
    generator = attr.ib(default=None)


@attr.s(frozen=True)
class Manifest(object):
    modpack_version = attr.ib()
    platform = attr.ib()
    extension = attr.ib()
    categories = attr.ib()
    presets = attr.ib()
    components = attr.ib()
    owned_patterns = attr.ib()
    dependencies = attr.ib(default=())
    owned_paths = attr.ib(default=())
    conflicts = attr.ib(default=())
    disabled_looks = attr.ib(default=())
    schema_version = attr.ib(default=SCHEMA_VERSION)

    def component(self, component_id):
        return next((component for component in self.components if component.id == component_id), None)

    def dependencies_of(self, component_id):
        """The third-party runtime mods the component needs, in catalog order."""
        return tuple(dependency for dependency in self.dependencies if component_id in dependency.required_by)

    def to_json(self):
        """components.json: the dependency entries follow our packages in `components`."""
        data = _to_json(self)
        data['components'] = data['components'] + data.pop('dependencies')
        return data


def camel(name):
    head, rest = name.split('_')[0], name.split('_')[1:]
    return head + ''.join(part.title() for part in rest)


def _to_json(value):
    if attr.has(type(value)):
        return {camel(field.name): _to_json(getattr(value, field.name)) for field in attr.fields(type(value))}
    if isinstance(value, (tuple, list)):
        return [_to_json(item) for item in value]
    return value
