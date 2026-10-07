from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import FeatureComponent
from ....core.hooks import is_restorable, override, restore
from ....core.log import log, safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import circle_percent, is_scaled, scaled_size
from ..settings import SCHEMA, SWITCH
from .constants import MARKER_METHOD, MARKER_RELAX_ARG

try:
    from AvatarInputHandler.gun_marker_ctrl import _DefaultGunMarkerController
except Exception:
    _DefaultGunMarkerController = None


# Fair play: the gun marker the client computed, drawn at a share of its size.
class AimCircle(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.installed = False
        self.missing_logged = False
        app.bus.on('battle_enter', self.install)
        app.bus.on('battle_leave', self.remove)

    @safe
    def install(self):
        if self.installed or not self._wanted():
            return
        if _DefaultGunMarkerController is None:
            if not self.missing_logged:
                self.missing_logged = True
                log('aim circle: stays the client size')
            return
        self.installed = True
        component = self

        @override(_DefaultGunMarkerController, MARKER_METHOD)
        def _update(original, controller, *args, **kwargs):
            result = original(controller, *args, **kwargs)
            if len(args) > MARKER_RELAX_ARG:
                component.scale(controller, args[MARKER_RELAX_ARG])
            return result

    @safe
    def remove(self):
        if not self.installed or not is_restorable(_DefaultGunMarkerController, MARKER_METHOD):
            return
        restore(_DefaultGunMarkerController, MARKER_METHOD)
        self.installed = False

    def _wanted(self):
        return self.enabled() and is_scaled(self.settings.get('size'))

    def scale(self, controller, relax_time):
        provider = getattr(controller, '_dataProvider', None)
        if provider is None or not self._wanted():
            return
        provider.updateSize(scaled_size(controller.getSize(), circle_percent(self.settings.get('size'))), relax_time)
