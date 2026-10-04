from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import panel_schema
from ....core.settings import fix
from .constants import ADVANCED, CHOICES, DEFAULTS, FIXED, GROUP, LIMITS, PANEL_ID, SECTION, SWITCH  # noqa: F401

SETTINGS = (SWITCH,)
SCHEMA = fix(panel_schema(DEFAULTS, choices=CHOICES, limits=LIMITS), FIXED)
