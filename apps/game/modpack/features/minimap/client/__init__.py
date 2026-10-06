from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.native import RecommendedSettingsComponent
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import to_account, to_native
from ..model.constants import ONCE
from ..settings import SCHEMA, SWITCH


class MinimapComponent(RecommendedSettingsComponent):

    once = ONCE


def create_minimap(app):
    return MinimapComponent(app, FEATURE_ID, SCHEMA, SWITCH, STRINGS, to_native, to_account)
