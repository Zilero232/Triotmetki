from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import selected_vehicle
from ....core.client.native import NativeSettingsComponent
from ....core.client.native.settings_core import settings_core
from ....core.log import safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import (
    ACTION_CREW,
    ACTION_DEMOUNT,
    ACTION_KEYS,
    ACTION_RETURN,
    ACTION_STYLE,
    carousel_row_count,
    plan_crew_return,
    plan_crew_unload,
    plan_demount,
    plan_style_removal,
    to_native,
    with_interface_scale,
)
from ..settings import SCHEMA, SWITCH
from .carousel import CarouselRows
from .processors import demount, remove_style, return_crew, unload_crew
from .vehicle import device_in, free_berths, summary


def scale_options():
    try:
        return list(settings_core().interfaceScale.getScaleOptions())
    except Exception:
        return []


class HangarTweaks(NativeSettingsComponent):

    def __init__(self, app):
        NativeSettingsComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS, to_native)
        self.carousel_rows = CarouselRows(self.row_count)

    def settings_changed(self, changed):
        NativeSettingsComponent.settings_changed(self, changed)
        self.carousel_rows.resend()

    def row_count(self, stock):
        if not self.enabled_in_hangar():
            return stock
        return carousel_row_count(self.settings.get('carousel_rows'), stock)

    def desired(self):
        values = self.settings.to_dict()
        return with_interface_scale(to_native(values), values.get('interface_scale'), scale_options())

    def _actions_enabled(self):
        return self.enabled_in_hangar() and self.settings.get('quick_actions')

    def ui_actions(self):
        if not self._actions_enabled():
            return []
        return [self._action_button(action, key) for action, key in ACTION_KEYS]

    def _action_button(self, action, key):
        translate = self.app.translate
        return {
            'id': action,
            'label': translate('hangar_tweaks_%s' % key),
            'confirm': translate('hangar_tweaks_%s_confirm' % key),
        }

    def ui_action(self, action, row=None, value=None):
        vehicle = selected_vehicle()
        if not self._actions_enabled() or vehicle is None:
            return self.notice_error('hangar_tweaks_refused_nothing')

        requests = {
            ACTION_DEMOUNT: self._demount,
            ACTION_CREW: self._unload_crew,
            ACTION_RETURN: self._return_crew,
            ACTION_STYLE: self._remove_style,
        }
        request = requests.get(action)
        if request is None:
            return None

        refusal = request(vehicle, summary(vehicle))
        if refusal:
            return self.notice_error('hangar_tweaks_refused_%s' % refusal)
        return self.notice_info('hangar_tweaks_sent')

    def _demount(self, vehicle, state):
        planned_devices, refusal = plan_demount(state)
        if not refusal:
            demount(vehicle, planned_devices, device_in, self._done)
        return refusal

    def _unload_crew(self, vehicle, state):
        _, refusal = plan_crew_unload(state, free_berths())
        if not refusal:
            unload_crew(vehicle, self._done)
        return refusal

    def _return_crew(self, vehicle, state):
        refusal = plan_crew_return(state)
        if not refusal:
            return_crew(vehicle, self._done)
        return refusal

    def _remove_style(self, vehicle, state):
        refusal = plan_style_removal(state)
        if not refusal:
            remove_style(vehicle, self._done)
        return refusal

    @safe
    def _done(self, success):
        if not success:
            self.app.ui.notify(self.app.translate('hangar_tweaks_failed'))
