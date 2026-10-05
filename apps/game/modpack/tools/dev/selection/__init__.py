"""Which packages a dev install carries: the asked component ids, what they depend on, and the third-party mods.

The rules are the manager's (install::selection, Catalog::with_dependencies, dependencies::resolve): every catalog
entry marked `required` joins, each package brings its own dependencies (tools/build/layout: core, companion) and
the catalog entry's `dependencies`, and a third-party mod joins when one of its `requiredBy` is installed. Optional
third-party mods (ModsList) never join on their own, as switching a component on in the manager never installs them.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import attr


class SelectionError(ValueError):
    """An asked id that is neither a package nor a catalog entry."""


@attr.s(frozen=True)
class Selection(object):
    keys = attr.ib()
    dependencies = attr.ib()


def package_dependencies(packages, catalog):
    """{key: set of keys it needs}: the package's own depends plus its catalog entry's `dependencies`."""
    needs = {}
    for package in packages:
        entry = catalog.entry(package.key)
        extra = entry.dependencies if entry is not None else ()
        needs[package.key] = {dependency.key for dependency in package.depends} | set(extra)
    return needs


def with_dependencies(keys, needs):
    """keys and everything they need, transitively."""
    found = set()
    pending = list(keys)
    while pending:
        key = pending.pop()
        if key in found:
            continue
        found.add(key)
        pending.extend(needs.get(key, ()))
    return found


def third_party(catalog, keys):
    """The non-optional `kind: "dependency"` entries one of `keys` requires, in catalog order."""
    return tuple(
        dependency for dependency in catalog.dependencies
        if not dependency.optional and any(key in keys for key in dependency.required_by)
    )


def select(packages, catalog, requested=()):
    """Selection for the asked ids; no ids means every package. Keys keep the build's order."""
    all_keys = [package.key for package in packages]
    unknown = [key for key in requested if key not in all_keys]
    if unknown:
        raise SelectionError('unknown component id(s): %s' % ', '.join(unknown))
    required = [entry.id for entry in catalog.components if entry.required]
    wanted = with_dependencies(list(requested or all_keys) + required, package_dependencies(packages, catalog))
    keys = tuple(key for key in all_keys if key in wanted)
    return Selection(keys=keys, dependencies=third_party(catalog, keys))
