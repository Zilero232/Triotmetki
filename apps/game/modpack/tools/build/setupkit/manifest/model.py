"""The components manifest model: the hand-written catalog (input) and components.json (output).

components.json is camelCase JSON for the modpack manager; the catalog uses
the same spelling. Plain frozen dataclasses: the tooling runs on a bare Python 3 (tools/run_tests.py).
"""
import dataclasses
from dataclasses import dataclass
from typing import Optional, Tuple

SCHEMA_VERSION = 1
DEPENDENCY_KIND = 'dependency'


@dataclass(frozen=True)
class Localized:
    ru: str
    en: str


@dataclass(frozen=True)
class Category:
    id: str
    title: Localized
    description: Localized


@dataclass(frozen=True)
class Preset:
    id: str
    title: Localized
    description: Localized
    custom: bool = False


@dataclass(frozen=True)
class Preview:
    """In the catalog `image` is relative to catalog/ and `audio` to assets/;
    in the manifest both to the manifest's folder."""
    image: Optional[str] = None
    video: Optional[str] = None
    audio: Optional[str] = None


@dataclass(frozen=True)
class CatalogEntry:
    """UI metadata of one package key; `dependencies` adds to the package's own (core, companion)."""
    id: str
    category: str
    title: Localized
    description: Localized
    fair_play: Localized
    presets: Tuple[str, ...] = ()
    required: bool = False
    preview: Preview = Preview()
    dependencies: Tuple[str, ...] = ()
    perf: Optional[str] = None
    context: Optional[str] = None


@dataclass(frozen=True)
class ConflictRule:
    """Third-party mods that duplicate some of our components: `patterns` are case-insensitive masks over a package's
    file name and its meta.xml id; the manager warns when one is installed next to an enabled component it lists."""
    id: str
    title: Localized
    patterns: Tuple[str, ...]
    components: Tuple[str, ...]
    note: Localized


@dataclass(frozen=True)
class Author:
    name: str
    url: str


@dataclass(frozen=True)
class Licence:
    name: str
    url: str
    sha256: str


@dataclass(frozen=True)
class Dependency:
    """A third-party runtime mod (`kind: "dependency"`): not our package, passed through to components.json as is.

    The manager downloads `source_url` only when the player has no copy, checks `sha256` and `size`, keeps the
    licence text from `licence.url` (checked by `licence.sha256`) and ticks it when a `required_by` id is selected. An
    `optional` one only improves them (ModsList): switching a component on never installs it.
    """
    id: str
    kind: str
    package_id: str
    version: str
    file: str
    title: Localized
    description: Localized
    author: Author
    licence: Licence
    source_url: str
    sha256: str
    size: int
    required_by: Tuple[str, ...]
    optional: bool
    restart_required: bool


@dataclass(frozen=True)
class Catalog:
    categories: Tuple[Category, ...]
    presets: Tuple[Preset, ...]
    components: Tuple[CatalogEntry, ...]
    owned_patterns: Tuple[str, ...]
    fallback_category: str
    fallback_fair_play: Localized
    dependencies: Tuple[Dependency, ...] = ()
    owned_paths: Tuple[str, ...] = ()
    conflicts: Tuple[ConflictRule, ...] = ()

    def entry(self, key):
        return next((entry for entry in self.components if entry.id == key), None)

    @property
    def default_preset(self):
        return self.presets[0].id


@dataclass(frozen=True)
class Component:
    id: str
    package_id: str
    version: str
    file: str
    category: str
    title: Localized
    description: Localized
    fair_play: Localized
    required: bool
    default: bool
    presets: Tuple[str, ...]
    preview: Preview
    dependencies: Tuple[str, ...]
    catalogued: bool
    sha256: Optional[str] = None
    size: Optional[int] = None
    perf: Optional[str] = None
    context: Optional[str] = None


@dataclass(frozen=True)
class Manifest:
    modpack_version: str
    platform: str
    extension: str
    categories: Tuple[Category, ...]
    presets: Tuple[Preset, ...]
    components: Tuple[Component, ...]
    owned_patterns: Tuple[str, ...]
    dependencies: Tuple[Dependency, ...] = ()
    owned_paths: Tuple[str, ...] = ()
    conflicts: Tuple[ConflictRule, ...] = ()
    schema_version: int = SCHEMA_VERSION

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
    head, *rest = name.split('_')
    return head + ''.join(part.title() for part in rest)


def _to_json(value):
    if dataclasses.is_dataclass(value):
        return dict((camel(field.name), _to_json(getattr(value, field.name))) for field in dataclasses.fields(value))
    if isinstance(value, (tuple, list)):
        return [_to_json(item) for item in value]
    return value
