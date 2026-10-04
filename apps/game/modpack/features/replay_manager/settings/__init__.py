from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import max_length
from ....core.settings import Schema
from .constants import ADVANCED, DEFAULTS, GROUP, MAX_TEMPLATE, SWITCH  # noqa: F401

SETTINGS = (SWITCH,)
SCHEMA = Schema(DEFAULTS, normalizers={'name_template': max_length(MAX_TEMPLATE)})
