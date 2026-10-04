from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import component_schema
from ....core.settings import fix
from .constants import DEFAULTS, FIXED, GROUP, LIMITS, SECTION, SWITCH  # noqa: F401

SETTINGS = (SWITCH,)
SCHEMA = fix(component_schema(DEFAULTS, limits=LIMITS), FIXED)
