from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.log import log_exception
from ...core.vendor import attr
from ..fields import SWITCH_KEY, TYPE_BOOL, describe_fields, field_type
from .constants import OPTIONAL_HOOKS, PANEL_ADVANCED_KEYS, PANEL_OWNERS, PANEL_POSITION_KEYS
from .placement import placement_of


def _hook(instance, name, default=None):
    try:
        return getattr(instance, name)()
    except Exception:
        log_exception('ui %s of %s' % (name, type(instance).__name__))
        return default


@attr.s(eq=False)
class Component(object):

    id = attr.ib()
    group = attr.ib()
    source = attr.ib()
    keys = attr.ib(converter=tuple)
    switch = attr.ib(default=None)
    switch_source = attr.ib(default=None)
    panel = attr.ib(default=False)
    instance = attr.ib(default=None)
    fallback_title = attr.ib(default=None)
    config_keys = attr.ib(default=(), converter=tuple)
    config_source = attr.ib(default=None)
    advanced = attr.ib(default=(), converter=tuple)
    editor = attr.ib(default=None)

    def __attrs_post_init__(self):
        self.switch_source = self.switch_source or self.source

    def field_keys(self):
        hidden = set([self.switch, SWITCH_KEY]) if self.switch is not None else set()
        return [key for key in self.keys if key not in hidden and key not in PANEL_POSITION_KEYS]

    def editable(self, key):
        return key == self.switch or key in self.field_keys()

    def source_of(self, key):
        if key == self.switch:
            return self.switch_source
        if key in self.config_keys:
            return self.config_source
        return self.source

    def update(self, key, value):
        if not self.editable(key):
            return [], None
        source = self.source_of(key)
        return source.update({key: value}), source.kind

    def _describe_switch(self):
        switch_settings = self.switch_source.settings
        if self.switch is None or switch_settings is None:
            return None
        return {'key': self.switch, 'value': bool(switch_settings.get(self.switch))}

    def _advanced_keys(self):
        keys = set(self.advanced)
        if self.panel:
            keys.update(PANEL_ADVANCED_KEYS)
        instance = self.instance
        if instance is not None and hasattr(instance, 'ui_advanced'):
            keys.update(_hook(instance, 'ui_advanced') or ())
        return frozenset(keys)

    def _describe_fields(self, labels):
        advanced = self._advanced_keys()
        fields = []
        for key in self.field_keys():
            settings = self.source_of(key).settings
            if settings is not None:
                fields.extend(describe_fields(settings, [key], self.id, labels))
        for field in fields:
            if field['key'] in advanced:
                field['advanced'] = True
        return fields

    def _describe_optional(self, labels):
        instance = self.instance
        described = {}
        if self.editor is not None and self.source.settings is not None:
            described['editor'] = self.editor(self.source.settings, labels.text)
        if instance is not None:
            hooks = [(key, hook) for key, hook in OPTIONAL_HOOKS if hasattr(instance, hook)]
            described.update((key, _hook(instance, hook)) for key, hook in hooks)
        return described

    def describe(self, labels):
        section, context = placement_of(self.id, self.group, self.panel)
        described = {
            'id': self.id,
            'group': self.group,
            'section': section,
            'context': context,
            'title': labels.title(self.id, self.fallback_title),
            'hint': labels.component_hint(self.id),
            'switch': self._describe_switch(),
            'fields': self._describe_fields(labels),
            'panel': bool(self.panel),
            'actions': [],
            'page': None,
        }
        instance = self.instance
        if instance is not None and hasattr(instance, 'ui_actions'):
            described['actions'] = list(_hook(instance, 'ui_actions') or [])
        if instance is not None and hasattr(instance, 'ui_page'):
            described['page'] = _hook(instance, 'ui_page')
        described.update(self._describe_optional(labels))
        owner = PANEL_OWNERS.get(self.id) if self.switch is None else None
        if owner is not None:
            described['owner'] = owner
        return described


def switch_of(settings, keys, candidates):
    for key in keys:
        if key in candidates and field_type(settings.schema, key) == TYPE_BOOL:
            return key
    return None


def section_switch(settings):
    if settings is not None and SWITCH_KEY in settings.schema.defaults:
        return SWITCH_KEY
    return None
