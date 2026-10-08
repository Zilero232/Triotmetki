from __future__ import absolute_import, division, print_function, unicode_literals

import copy

from ...companion.config.constants import DEFAULTS_REVISION
from ...companion.config.migrate import migrated
from ...core.compat import is_int
from ...core.hud.modes import PLACES_SECTION, clean_places
from .constants import (
    CODE_EXCLUDED_CONFIG_KEYS,
    CODE_EXCLUDED_SECTION_KEYS,
    CODE_EXCLUDED_SECTIONS,
    CODE_RAW_SECTIONS,
    EXCLUDED_CONFIG_KEYS,
    EXCLUDED_CONFIG_PREFIXES,
    EXCLUDED_SECTIONS,
    REVISION_KEY,
)


def is_excluded(key):
    return key in EXCLUDED_CONFIG_KEYS or key.startswith(EXCLUDED_CONFIG_PREFIXES)


def portable_values(values):
    return {key: value for key, value in values.items() if not is_excluded(key)}


def take_snapshot(config, component_config=None):
    values = portable_values(config.to_dict())
    sections = copy.deepcopy(component_config.data) if component_config is not None else {}
    for key in EXCLUDED_SECTIONS:
        sections.pop(key, None)
    return {'config': values, 'components': sections, REVISION_KEY: DEFAULTS_REVISION}


def _part(snapshot, key):
    part = snapshot.get(key) if isinstance(snapshot, dict) else None
    return part if isinstance(part, dict) else {}


def shared_snapshot(snapshot):
    values = _part(snapshot, 'config')
    shared_values = {
        key: value for key, value in values.items() if key not in CODE_EXCLUDED_CONFIG_KEYS and not is_excluded(key)
    }
    sections = {}
    for key, section in _part(snapshot, 'components').items():
        if not isinstance(section, dict) or key in CODE_EXCLUDED_SECTIONS or key in EXCLUDED_SECTIONS:
            continue
        dropped = CODE_EXCLUDED_SECTION_KEYS.get(key, ())
        sections[key] = {name: value for name, value in section.items() if name not in dropped}
    return {'config': shared_values, 'components': sections, REVISION_KEY: snapshot_revision(snapshot)}


def imported_snapshot(snapshot, config, component_config=None):
    shared = shared_snapshot(current_snapshot(snapshot, component_config))
    known_keys = config.schema.defaults
    values = {key: value for key, value in shared['config'].items() if key in known_keys}
    sections = {}
    for key, section in shared['components'].items():
        known = _known_section(key, section, component_config)
        if known is not None:
            sections[key] = known
    return {'config': values, 'components': sections, REVISION_KEY: DEFAULTS_REVISION}


def snapshot_revision(snapshot):
    revision = snapshot.get(REVISION_KEY) if isinstance(snapshot, dict) else None
    return revision if is_int(revision) else None


def _schema_defaults_of(component_config):
    def schema_defaults(section):
        settings = component_config.get(section) if component_config is not None else None
        if settings is None:
            return None
        return settings.schema.defaults

    return schema_defaults


def current_snapshot(snapshot, component_config=None):
    """`snapshot` moved to the current settings layout by the companion's own migration when it says it was taken
    by an older mod; one without a revision (taken before profiles kept it) or a current one unchanged."""
    revision = snapshot_revision(snapshot)
    if revision is None or revision >= DEFAULTS_REVISION:
        return snapshot

    stored_config = dict(_part(snapshot, 'config'), defaults_revision=revision)
    components = copy.deepcopy(_part(snapshot, 'components'))
    schema_defaults = _schema_defaults_of(component_config)
    config, sections = migrated(stored_config, components, schema_defaults)

    return {'config': portable_values(config), 'components': sections, REVISION_KEY: DEFAULTS_REVISION}


def _known_section(key, section, component_config):
    if key == PLACES_SECTION:
        return clean_places(section)
    if key in CODE_RAW_SECTIONS:
        return copy.deepcopy(section)
    settings = component_config.get(key) if component_config is not None else None
    if settings is None:
        return None
    known_keys = settings.schema.defaults
    return {name: copy.deepcopy(value) for name, value in section.items() if name in known_keys}


def apply_snapshot(snapshot, config, save_config, component_config=None, layer=None):
    snapshot = current_snapshot(snapshot, component_config)
    changes = {}
    changed = config.update(portable_values(_part(snapshot, 'config')))
    if changed:
        save_config()
        changes['config'] = changed
    if component_config is not None:
        changes.update(_apply_sections(_part(snapshot, 'components'), component_config, layer))
    return changes


def _apply_sections(sections, component_config, layer):
    changes = {}
    has_raw_sections = False
    panels = getattr(layer, 'panels', {}) if layer is not None else {}
    for key, section in sorted(sections.items()):
        if not isinstance(section, dict) or key in EXCLUDED_SECTIONS:
            continue
        if component_config.get(key) is None:
            component_config.data[key] = copy.deepcopy(section)
            has_raw_sections = True
            continue
        update = layer.update_settings if key in panels else component_config.update
        changed = update(key, section)
        if changed:
            changes[key] = changed

    if has_raw_sections:
        component_config.save()
    return changes
