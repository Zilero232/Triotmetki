from __future__ import absolute_import, division, print_function, unicode_literals

from ....hooks import override
from ....hud.stock import CONSUMABLES_PANEL, bar_slots, stock_metrics
from ....log import log, safe
from .constants import BAR_METHODS, MINIMAP_RESIZE_METHOD, MINIMAP_SIZE_SETTING

try:
    from gui.Scaleform.daapi.view.battle.shared.consumables_panel import ConsumablesPanel
except Exception:
    ConsumablesPanel = None

try:
    from gui.Scaleform.daapi.view.battle.shared.minimap.component import MinimapComponent
except Exception:
    MinimapComponent = None


def _page_panel(page):
    components = getattr(page, 'components', None)
    return components.get(CONSUMABLES_PANEL) if isinstance(components, dict) else None


def _minimap_index():
    try:
        from account_helpers.AccountSettings import AccountSettings
        return AccountSettings.getSettings(MINIMAP_SIZE_SETTING)
    except Exception:
        return None


class StockMetrics(object):

    def __init__(self, layer):
        self.layer = layer
        self.installed = False
        self.panel = None
        self.minimap = None

    def install(self):
        if self.installed:
            return
        self.installed = True
        for name in BAR_METHODS:
            if ConsumablesPanel is not None and hasattr(ConsumablesPanel, name):
                self._follow(name)
        if MinimapComponent is not None and hasattr(MinimapComponent, MINIMAP_RESIZE_METHOD):
            self._follow_minimap()
        else:
            log('HUD: the minimap resize is not hooked, the attached panels keep the size from the setting')

    def _follow(self, name):
        metrics = self

        @override(ConsumablesPanel, name)
        def _changed(original, panel, *args, **kwargs):
            result = original(panel, *args, **kwargs)
            metrics.measure(panel)
            return result

    def _follow_minimap(self):
        metrics = self

        @override(MinimapComponent, MINIMAP_RESIZE_METHOD)
        def _resized(original, component, size_index, *args, **kwargs):
            result = original(component, size_index, *args, **kwargs)
            metrics.minimap_resized(size_index)
            return result

    @safe
    def measure(self, panel=None):
        if panel is not None:
            self.panel = panel
        slots = bar_slots(getattr(self.panel, '_mask', None))
        index = self.minimap if self.minimap is not None else _minimap_index()
        self.layer.set_stock_metrics(stock_metrics(index, slots))

    def minimap_resized(self, size_index):
        self.minimap = size_index
        self.measure()

    def measure_page(self, page):
        self.forget()
        self.measure(_page_panel(page))

    def page_toggled(self, page, visible, hidden):
        if CONSUMABLES_PANEL in set(visible or ()) | set(hidden or ()):
            self.measure(_page_panel(page))

    def forget(self):
        self.panel = None
        self.minimap = None
