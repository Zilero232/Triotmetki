from __future__ import absolute_import, division, print_function, unicode_literals

import copy

from .constants import (
    CODE_EXCLUDED_CONFIG_KEYS,
    CODE_EXCLUDED_SECTION_KEYS,
    CODE_EXCLUDED_SECTIONS,
    CODE_RAW_SECTIONS,
    EXCLUDED_CONFIG_KEYS,
    EXCLUDED_CONFIG_PREFIXES,
    EXCLUDED_SECTIONS,
)


def is_excluded(key):
    return key in EXCLUDED_CONFIG_KEYS or key.startswith(EXCLUDED_CONFIG_PREFIXES)


def portable_values(values):
    return dict((key, value) for key, value in values.items() if not is_excluded(key))


def take_snapshot(config, component_config=None):
    values = portable_values(config.to_dict())
    sections = copy.deepcopy(component_config.data) if component_config is not None else {}
    for key in EXCLUDED_SECTIONS:
        sections.pop(key, None)
    return {'config': values, 'components': sections}


def _part(snapshot, key):
    part = snapshot.get(key) if isinstance(snapshot, dict) else None
    return part if isinstance(part, dict) else {}


def shared_snapshot(snapshot):
    values = _part(snapshot, 'config')
    shared_values = dict(
        (key, value) for key, value in values.items() if key not in CODE_EXCLUDED_CONFIG_KEYS and not is_excluded(key)
    )
    sections = {}
    for key, section in _part(snapshot, 'components').items():
        if not isinstance(section, dict) or key in CODE_EXCLUDED_SECTIONS or key in EXCLUDED_SECTIONS:
            continue
        dropped = CODE_EXCLUDED_SECTION_KEYS.get(key, ())
        sections[key] = dict((name, value) for name, value in section.items() if name not in dropped)
    return {'config': shared_values, 'components': sections}


def imported_snapshot(snapshot, config, component_config=None):
    shared = shared_snapshot(snapshot)
    known_keys = config.schema.defaults
    values = dict((key, value) for key, value in shared['config'].items() if key in known_keys)
    sections = {}
    for key, section in shared['components'].items():
        known = _known_section(key, section, component_config)
        if known is not None:
            sections[key] = known
    return {'config': values, 'components': sections}


def _known_section(key, section, component_config):
    if key in CODE_RAW_SECTIONS:
        return copy.deepcopy(section)
    settings = component_config.get(key) if component_config is not None else None
    if settings is None:
        return None
    known_keys = settings.schema.defaults
    return dict((name, copy.deepcopy(value)) for name, value in section.items() if name in known_keys)


def apply_snapshot(snapshot, config, save_config, component_config=None, layer=None):
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
