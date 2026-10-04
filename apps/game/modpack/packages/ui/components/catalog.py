from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.vendor import attr
from .component import Component, section_switch, switch_of
from .constants import (
    COMPANION_ADVANCED,
    COMPANION_ID,
    COMPANION_KEYS,
    COMPANION_SWITCH,
    GROUP_BATTLE,
    GROUP_DATA,
    GROUP_HANGAR,
    HIDDEN_CONFIG_KEYS,
)
from .sources import ConfigSource, SectionSource


@attr.s(eq=False)
class FeatureInfo(object):

    id = attr.ib()
    settings_module = attr.ib(default=None)
    instance = attr.ib(default=None)
    title = attr.ib(default=None)
    editor_module = attr.ib(default=None)

    def config_keys(self):
        return tuple(getattr(self.settings_module, 'SETTINGS', ()) or ())

    def advanced(self):
        return tuple(getattr(self.settings_module, 'ADVANCED', ()) or ())

    def editor(self):
        return getattr(self.editor_module, 'editor', None)

    def group(self, panel):
        declared = getattr(self.settings_module, 'GROUP', None)
        if declared:
            return declared
        return GROUP_BATTLE if panel else GROUP_HANGAR


@attr.s
class CatalogSources(object):

    config = attr.ib()
    save_config = attr.ib()
    component_config = attr.ib()
    layer = attr.ib()
    switch_keys = attr.ib()

    @classmethod
    def of(cls, context):
        return cls(context.config, context.save_config, context.component_config, context.layer, context.switch_keys)

    def panels(self):
        return getattr(self.layer, 'panels', {}) if self.layer is not None else {}

    def section(self, component_id):
        return self.component_config.get(component_id) if self.component_config is not None else None

    def config_source(self):
        return ConfigSource(self.config, self.save_config)

    def section_source(self, component_id):
        return SectionSource(self.component_config, component_id, self.layer)

    def has_config_key(self, key):
        return key in self.config.schema.defaults


def companion_component(sources, claimed, instance=None):
    keys = [COMPANION_SWITCH]
    keys += [key for key in COMPANION_KEYS if sources.has_config_key(key) and key not in claimed]
    return Component(
        COMPANION_ID,
        GROUP_DATA,
        sources.config_source(),
        keys,
        switch=COMPANION_SWITCH,
        instance=instance,
        advanced=COMPANION_ADVANCED,
    )


def _config_keys(feature, sources):
    keys = [key for key in feature.config_keys() if key not in HIDDEN_CONFIG_KEYS]
    return [key for key in keys if sources.has_config_key(key)]


def _section_component(feature, sources, section, config_keys, config_switch):
    panel = feature.id in sources.panels()
    config_fields = [key for key in config_keys if key != config_switch]
    return Component(
        feature.id,
        feature.group(panel),
        sources.section_source(feature.id),
        sorted(section.schema.defaults) + config_fields,
        switch=config_switch or section_switch(section),
        switch_source=sources.config_source() if config_switch else None,
        panel=panel,
        instance=feature.instance,
        fallback_title=feature.title,
        config_keys=config_fields,
        config_source=sources.config_source(),
        advanced=feature.advanced(),
        editor=feature.editor(),
    )


def _feature_component(feature, sources):
    keys = _config_keys(feature, sources)
    config_switch = switch_of(sources.config, keys, sources.switch_keys)
    section = sources.section(feature.id)
    if section is not None:
        return _section_component(feature, sources, section, keys, config_switch)
    if not keys and feature.instance is None:
        return None

    panel = feature.id in sources.panels()
    return Component(
        feature.id,
        feature.group(panel),
        sources.config_source(),
        keys,
        switch=config_switch,
        panel=panel,
        instance=feature.instance,
        fallback_title=feature.title,
        advanced=feature.advanced(),
        editor=feature.editor(),
    )


def _panel_component(sources, panel_id, section):
    return Component(
        panel_id,
        GROUP_BATTLE,
        sources.section_source(panel_id),
        sorted(section.schema.defaults),
        switch=section_switch(section),
        panel=True,
    )


def _claimed_keys(features):
    claimed = set()
    for feature in features:
        claimed.update(feature.config_keys())
    return claimed


def build_catalog(context, companion_instance=None):
    features = context.features()
    sources = CatalogSources.of(context)
    components = [companion_component(sources, _claimed_keys(features), companion_instance)]

    for feature in features:
        component = _feature_component(feature, sources)
        if component is not None:
            components.append(component)

    seen = set(component.id for component in components)
    for panel_id in sorted(sources.panels()):
        section = sources.section(panel_id)
        if panel_id not in seen and section is not None:
            components.append(_panel_component(sources, panel_id, section))
    return components


def find(components, component_id):
    for component in components:
        if component.id == component_id:
            return component
    return None
