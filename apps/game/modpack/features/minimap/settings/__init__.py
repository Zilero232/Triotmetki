from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.settings import Schema
from .constants import CHOICES, DEFAULTS, GROUP, NORMALIZERS, SWITCH  # noqa: F401

SETTINGS = (SWITCH,)
SCHEMA = Schema(DEFAULTS, choices=CHOICES, normalizers=NORMALIZERS)
