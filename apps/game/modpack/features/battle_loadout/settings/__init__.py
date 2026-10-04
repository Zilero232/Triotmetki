from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import panel_schema
from ....core.settings import fix
from .constants import ADVANCED, DEFAULTS, FIXED, GROUP, PANEL_ID, RETIRED_PLACES, SWITCH  # noqa: F401

SETTINGS = (SWITCH,)
SCHEMA = fix(panel_schema(DEFAULTS, retired=RETIRED_PLACES), FIXED)
