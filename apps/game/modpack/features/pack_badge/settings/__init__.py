from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import component_schema
from .constants import CHOICES, DEFAULTS, GROUP, SECTION, SWITCH  # noqa: F401

SETTINGS = (SWITCH,)
SCHEMA = component_schema(DEFAULTS, choices=CHOICES)
