from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import component_schema
from .constants import ADVANCED, DEFAULTS, GROUP, IDLE_MINUTES, LIMITS, SECTION, SHARE, SHARE_CHANNEL, SWITCH  # noqa: F401

SETTINGS = (SWITCH, IDLE_MINUTES, SHARE, SHARE_CHANNEL)
SCHEMA = component_schema(DEFAULTS, limits=LIMITS)
