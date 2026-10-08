from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import component_schema
from ..model.constants import SHOW_OWN_KEY
from .constants import DEFAULTS, GROUP, SECTION, SWITCH  # noqa: F401

SETTINGS = (SWITCH, SHOW_OWN_KEY)
SCHEMA = component_schema(DEFAULTS)
