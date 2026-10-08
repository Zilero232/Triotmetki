from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.compat import is_finite_number
from ...core.hud import component_schema
from .constants import DEFAULTS, LIMITS, NUMBERS, SECTION


def window_schema():
    return component_schema(DEFAULTS, limits=LIMITS)


def layout_values(message):
    values = {}
    for key in NUMBERS:
        value = message.get(key)
        if is_finite_number(value):
            values[key] = int(round(value))
    placed = message.get('placed', True)
    if isinstance(placed, bool):
        values['placed'] = placed
    return values


class WindowLayout(object):

    def __init__(self, component_config):
        self.component_config = component_config

    def settings(self):
        config = self.component_config
        if config is None:
            return None
        return config.get(SECTION) or config.section(SECTION, window_schema())

    def describe(self):
        settings = self.settings()
        if settings is None:
            return dict(DEFAULTS)
        return {key: settings.get(key) for key in DEFAULTS}

    def update(self, message):
        if self.settings() is None:
            return []
        return self.component_config.update(SECTION, layout_values(message))

