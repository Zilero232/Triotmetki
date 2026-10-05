from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.hud import component_config
from ....core.client.native import RecommendedSettingsComponent
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import preset_reset, to_native
from ..settings import SCHEMA, SWITCH


class CameraSettings(RecommendedSettingsComponent):

    def settings_changed(self, changed):
        reset = preset_reset(self.settings.to_dict(), changed)
        moved = component_config(self.app).update(self.component_id, reset) if reset else []
        RecommendedSettingsComponent.settings_changed(self, list(changed) + list(moved))


def create_camera(app):
    return CameraSettings(app, FEATURE_ID, SCHEMA, SWITCH, STRINGS, to_native)
