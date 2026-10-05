from __future__ import absolute_import, division, print_function, unicode_literals

import copy

from .constants import EXCLUDED_CONFIG_KEYS, EXCLUDED_CONFIG_PREFIXES, EXCLUDED_SECTIONS


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
