from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import component_schema, max_length
from ....core.settings import fix
from .constants import ADVANCED, CHOICES, DEFAULTS, FIXED, GROUP, LIMITS, MAX_WORDS, SECTION, SWITCH  # noqa: F401

SETTINGS = (SWITCH,)
SCHEMA = fix(
    component_schema(DEFAULTS, choices=CHOICES, limits=LIMITS, normalizers={'block_words': max_length(MAX_WORDS)}),
    FIXED,
)
