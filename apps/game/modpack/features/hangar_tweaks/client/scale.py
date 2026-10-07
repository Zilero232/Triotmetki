from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.native.settings_core import settings_core
from ....core.hooks import subscribe
from ....core.log import guarded
from ..model.constants import INTERFACE_SCALE

# RU 1.45 client source: options.InterfaceScaleSetting.setSystemValue, InterfaceScaleManager.changeScale.


def current_scale():
    return settings_core().interfaceScale.get()


def apply_scale(scale):
    core = settings_core()
    core.options.getSetting(INTERFACE_SCALE).setSystemValue(scale)
    core.interfaceScale.changeScale(scale)


def restore_scale():
    core = settings_core()
    stored = core.getSetting(INTERFACE_SCALE)
    core.options.getSetting(INTERFACE_SCALE).setSystemValue(stored)
    core.interfaceScale.scaleChanged()


@guarded('hangar tweaks: interface scale')
def on_scale_changed(callback):
    subscribe(settings_core().interfaceScale, 'onScaleChanged', callback)

