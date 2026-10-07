from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import component_schema, max_length
from ..model.constants import MAX_TEMPLATE_CHARS, TEXT_SUFFIX, TRIGGERS
from .constants import ADVANCED, CHOICES, DEFAULTS, GROUP, LIMITS, SECTION, SWITCH  # noqa: F401

SETTINGS = (SWITCH,)
SCHEMA = component_schema(
    DEFAULTS,
    choices=CHOICES,
    limits=LIMITS,
    normalizers={trigger + TEXT_SUFFIX: max_length(MAX_TEMPLATE_CHARS) for trigger in TRIGGERS},
)
