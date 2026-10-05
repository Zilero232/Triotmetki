from __future__ import absolute_import, division, print_function, unicode_literals

from ....hooks import override
from ....hud.stock import bar_slots, stock_metrics
from ....log import safe
from .constants import BAR_METHODS, CONSUMABLES_PANEL, MINIMAP_SIZE_SETTING

try:
    from gui.Scaleform.daapi.view.battle.shared.consumables_panel import ConsumablesPanel
except Exception:  # the panel moved: the attached panels keep the fallback width
    ConsumablesPanel = None


def _minimap_index():
    try:
        from account_helpers.AccountSettings import AccountSettings
        return AccountSettings.getSettings(MINIMAP_SIZE_SETTING)
    except Exception:  # no account settings outside the client: the fallback size
        return None


# The stock sizes the attached panels follow (core.hud.panel ATTACHED): the minimap side from the player's setting and
# the consumables panel's width from the slots it added, measured when the battle page appears and after each slot
# change.
class StockMetrics(object):

    def __init__(self, layer):
        self.layer = layer
        self.installed = False

    def install(self):
        if self.installed or ConsumablesPanel is None:
            return
        self.installed = True
        for name in BAR_METHODS:
            if hasattr(ConsumablesPanel, name):
                self._follow(name)

    def _follow(self, name):
        metrics = self

        @override(ConsumablesPanel, name)
        def _changed(original, panel, *args, **kwargs):
            result = original(panel, *args, **kwargs)
            metrics.measure(panel)
            return result

    @safe
    def measure(self, panel=None):
        slots = bar_slots(getattr(panel, '_mask', None))
        self.layer.set_stock_metrics(stock_metrics(_minimap_index(), slots))

    def measure_page(self, page):
        components = getattr(page, 'components', None)
        panel = components.get(CONSUMABLES_PANEL) if isinstance(components, dict) else None
        self.measure(panel)
