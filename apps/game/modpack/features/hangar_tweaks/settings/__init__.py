from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.settings import Schema
from ..model import normalize_rows
from .constants import ADVANCED, CHOICES, DEFAULTS, GROUP, LIMITS, SWITCH  # noqa: F401

SETTINGS = (SWITCH,)
SCHEMA = Schema(DEFAULTS, choices=CHOICES, limits=LIMITS, normalizers={'carousel_rows': normalize_rows})
