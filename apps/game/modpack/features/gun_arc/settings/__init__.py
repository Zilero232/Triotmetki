from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import panel_schema
from .constants import ADVANCED, CHOICES, DEFAULTS, GROUP, PANEL_ID, RETIRED_PLACES, SWITCH  # noqa: F401

SETTINGS = (SWITCH,)
SCHEMA = panel_schema(DEFAULTS, choices=CHOICES, retired=RETIRED_PLACES)
