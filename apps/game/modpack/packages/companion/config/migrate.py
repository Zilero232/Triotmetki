from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.compat import is_int, is_number
from .constants import (
    AIM_CIRCLE_CHOICES,
    AIM_CIRCLE_FROM,
    AIM_CIRCLE_PART_REVISION,
    AIM_CIRCLE_PART_STOCK,
    AIM_CIRCLE_PART_TO,
    AIM_CIRCLE_REVISION,
    AIM_CIRCLE_TO,
    DEFAULTS_REVISION,
    DROPPED_KEYS,
    DROPPED_PANELS,
    DROPPED_SECTIONS,
    GUARDED_SWITCHES,
    LAYOUT_PLACES_SECTION,
    MERGED_SECTIONS,
    MERGED_SWITCHES,
    MIGRATION_REVISION,
    MOVED_PLACES,
    PLACE_ORDER,
    PLACE_KEYS,
    RETIRED_VALUES,
    SPLIT_KEYS,
    SPLIT_REVISION,
    SPLIT_SWITCHES,
    SWITCHED_OFF_PARTS,
    SWITCHED_PARTS,
    USER_SET_KEY,
)
from .user_set import user_set_tokens, with_user_set


def _stored_revision(config):
    revision = config.get('defaults_revision')
    return revision if is_int(revision) else 0


def _section(components, name):
    section = components.get(name)
    return section if isinstance(section, dict) else None


def _is_configured(section, defaults):
    return any(key not in PLACE_KEYS and section.get(key, value) != value for key, value in defaults.items())


def _guarded(config, components, schema_defaults):
    kept = []
    for switch, section_name in GUARDED_SWITCHES:
        section = _section(components, section_name)
        defaults = schema_defaults(section_name)
        if section is not None and defaults and _is_configured(section, defaults):
            kept.append(switch)
    return kept


def _merged_switches(config):
    merged = {}
    for target, sources in MERGED_SWITCHES:
        if any(config.get(key) is True for key in (target,) + sources):
            merged[target] = True
    return merged


def _moved_values(components):
    moved = {}
    for (old_section, old_key, old_default), (new_section, new_key) in MERGED_SECTIONS:
        section = _section(components, old_section)
        if section is None or old_key not in section or section[old_key] == old_default:
            continue
        moved.setdefault(new_section, {})[new_key] = section[old_key]
    return moved


def _switched_off_parts(config):
    parts = {}
    for switches, section_name, key in SWITCHED_OFF_PARTS:
        if all(config.get(switch) is False for switch in switches):
            parts.setdefault(section_name, {})[key] = False
    return parts


def _switched_parts(config):
    parts = {}
    for section_name, keys in SWITCHED_PARTS:
        if any(config.get(switch) is True for switch, _ in keys):
            parts[section_name] = {key: config.get(switch) is True for switch, key in keys}
    return parts


def _move_places(components, revision):
    for since, section_name, old, new in MOVED_PLACES:
        section = _section(components, section_name)
        if revision < since and section is not None and tuple(section.get(key) for key in PLACE_ORDER) == old:
            _apply(components, {section_name: dict(zip(PLACE_ORDER, new))})


def _retired_values(components, chosen, revision):
    retired = {}
    for since, section_name, key, old, new in RETIRED_VALUES:
        section = _section(components, section_name)
        if revision >= since or section is None or section.get(key) != old:
            continue
        if '%s.%s' % (section_name, key) not in chosen:
            retired.setdefault(section_name, {})[key] = new
    return retired


def _without_dropped_places(places):
    if not isinstance(places, dict):
        return places
    dropped = DROPPED_SECTIONS + DROPPED_PANELS
    kept = {}
    for mode, panels in places.items():
        if isinstance(panels, dict):
            panels = {panel: place for panel, place in panels.items() if panel not in dropped}
        kept[mode] = panels
    return kept


def _drop_keys(components):
    for section_name, key in DROPPED_KEYS:
        section = _section(components, section_name)
        if section is not None and key in section:
            components[section_name] = {name: value for name, value in section.items() if name != key}


def _apply(components, updates):
    for section_name, values in updates.items():
        section = dict(_section(components, section_name) or {})
        section.update(values)
        components[section_name] = section


def _split_switches(config, components):
    switches = {}
    for switch, parent, (section_name, key) in SPLIT_SWITCHES:
        section = _section(components, section_name) or {}
        switches[switch] = config.get(parent) is not False and section.get(key) is not False
    return switches


def _split_values(components):
    for (old_section, old_key), (new_section, new_key) in SPLIT_KEYS:
        stored = _section(components, old_section) or {}
        section = dict(_section(components, new_section) or {})
        if old_key in stored:
            section[new_key] = stored[old_key]
        else:
            section.pop(new_key, None)
        if section or new_section in components:
            components[new_section] = section


def _aim_circle_choice(percent):
    for lowest, choice in AIM_CIRCLE_CHOICES:
        if percent >= lowest:
            return choice
    return AIM_CIRCLE_CHOICES[-1][1]


def _move_aim_circle(components):
    section_name, switch_key, scale_key, scale_default = AIM_CIRCLE_FROM
    section = _section(components, section_name)
    if section is None or section.get(switch_key) is not True:
        return
    percent = section.get(scale_key, scale_default)
    if not is_number(percent):
        percent = scale_default
    target_section, target_key = AIM_CIRCLE_TO
    _apply(components, {target_section: {target_key: _aim_circle_choice(percent)}})


def _aim_circle_part(config, components):
    section_name, key = AIM_CIRCLE_TO
    choice = (_section(components, section_name) or {}).get(key)
    if choice in (None, AIM_CIRCLE_PART_STOCK):
        return config

    switch, part_section, part_key = AIM_CIRCLE_PART_TO
    _apply(components, {part_section: {part_key: choice}})
    config = dict(config)
    config[switch] = True
    return config


def _split(config, components):
    config = dict(config)
    switches = _split_switches(config, components)
    config.update(switches)
    turned_off = sorted(switch for switch, is_on in switches.items() if not is_on)
    config[USER_SET_KEY] = with_user_set(config.get(USER_SET_KEY), turned_off)
    _split_values(components)
    return config


def _merged(config, components, schema_defaults):
    stored_switches = dict(config)
    config = dict(config)
    config.update(_merged_switches(config))
    config[USER_SET_KEY] = with_user_set(config.get(USER_SET_KEY), _guarded(config, components, schema_defaults))
    _apply(components, _moved_values(components))
    _apply(components, _switched_off_parts(stored_switches))
    _apply(components, _switched_parts(config))
    return config


def migrated(config, components, schema_defaults):
    if not isinstance(config, dict) or not config:
        return config, components
    revision = _stored_revision(config)
    if revision >= DEFAULTS_REVISION:
        return config, components

    components = dict(components) if isinstance(components, dict) else {}
    if revision < MIGRATION_REVISION:
        config = _merged(config, components, schema_defaults)
    if revision < SPLIT_REVISION:
        config = _split(config, components)
    if revision < AIM_CIRCLE_REVISION:
        _move_aim_circle(components)
    if revision < AIM_CIRCLE_PART_REVISION:
        config = _aim_circle_part(config, components)
    _move_places(components, revision)
    chosen = user_set_tokens(config.get(USER_SET_KEY))
    _apply(components, _retired_values(components, chosen, revision))
    for name in DROPPED_SECTIONS:
        components.pop(name, None)
    _drop_keys(components)
    if LAYOUT_PLACES_SECTION in components:
        components[LAYOUT_PLACES_SECTION] = _without_dropped_places(components[LAYOUT_PLACES_SECTION])
    return config, components
