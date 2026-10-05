from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import component_schema, max_length, panel_schema
from ....core.settings import fix
from .constants import (  # noqa: F401
    ADVANCED,
    BONUS_TYPES,
    DEFAULTS,
    FIXED,
    LAST_DEFAULTS,
    LAST_PANEL_ID,
    LAST_RETIRED_PLACES,
    LAST_SWITCH,
    LIMITS,
    MAX_TEMPLATE,
    SECTION,
    SWITCH,
)

SETTINGS = (SWITCH, LAST_SWITCH)

SCHEMA = fix(
    component_schema(
        DEFAULTS,
        choices={'bonus_types': BONUS_TYPES},
        limits=LIMITS,
        normalizers={'template': max_length(MAX_TEMPLATE)},
    ),
    FIXED,
)
LAST_SCHEMA = panel_schema(LAST_DEFAULTS, retired=LAST_RETIRED_PLACES)
