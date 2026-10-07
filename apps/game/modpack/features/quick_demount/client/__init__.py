from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import FeatureComponent
from ....core.client.game import client_attr
from ....core.hooks import override
from ....core.log import log
from ..i18n import STRINGS
from ..model import demount_menu, vehicle_of
from ..settings import SCHEMA, SECTION, SWITCH
from .constants import MENU_CLASS, MENU_MODULE
from .garage import carriers_of, demount


class QuickDemount(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, SECTION, SCHEMA, SWITCH, STRINGS)
        menu = client_attr(MENU_MODULE, MENU_CLASS)
        if menu is None:
            log('quick demount: the tank setup device menu was not found, feature off')
            return
        override(menu, '_generateOptions')(self._generate_options)
        override(menu, 'onOptionSelect')(self._on_option_select)

    def _generate_options(self, original, handler, *args, **kwargs):
        options = original(handler, *args, **kwargs)
        if not self.enabled_in_hangar():
            return options
        current_id = handler._getVehicle().intCD
        menu = demount_menu(carriers_of(handler._intCD), current_id, self.settings, self.app.translate)
        if menu is None:
            return options
        items = [_menu_item(handler, item) for item in menu['items']]
        return list(options) + [handler._makeItem(menu['id'], menu['label'], optSubMenu=items)]

    def _on_option_select(self, original, handler, option_id, *args, **kwargs):
        vehicle_id = vehicle_of(option_id)
        if vehicle_id is None:
            return original(handler, option_id, *args, **kwargs)
        if self.enabled_in_hangar():
            demount(vehicle_id, handler._intCD)
        return None


# RU 1.45 AbstractContextMenuHandler._makeItem(optId, optLabel, optInitData, optSubMenu).
def _menu_item(handler, item):
    return handler._makeItem(item['id'], item['label'], optInitData={'enabled': item['enabled']})
