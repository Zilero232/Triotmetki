from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import component_schema, max_length
from ....core.settings import fix
from .constants import (  # noqa: F401
    ADVANCED,
    CHOICES,
    DEFAULTS,
    FIXED,
    GROUP,
    LIMITS,
    MAX_TEMPLATE,
    SECTION,
    SWITCH,
)

SETTINGS = (SWITCH,)
SCHEMA = fix(
    component_schema(DEFAULTS, choices=CHOICES, limits=LIMITS, normalizers={'template': max_length(MAX_TEMPLATE)}),
    FIXED,
)
