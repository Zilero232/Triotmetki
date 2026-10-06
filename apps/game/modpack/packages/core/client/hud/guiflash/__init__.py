"""GUIFlash (MIT; optional runtime dependency, not bundled) as a HUD backend.

The build that loads on Lesta 1.45 is CH4MPi's 0.6.x (`gambiter.guiflash_0.6.6.mtmod`, github.com/CH4MPi/GUIFlash,
2026-09-01): its `flash.py` imports `WindowLayer`. GambitER's 0.3.1 (and the spoter fork, the same 2019 code)
imports `ViewTypes`, which 1.45 removed, so it fails to import and this backend reports why.

API used: `g_guiFlash.createComponent(alias, COMPONENT_TYPE.LABEL, props, battle=, lobby=)` (0.6: a label
is drawn only in the spaces it is created for; 0.3 has no such arguments and draws in battle only),
`updateComponent(alias, props)`, `deleteComponent(alias)` and `COMPONENT_EVENT.UPDATED(alias, props)`, which
GUIFlash fires from its `py_update` when the player drags a component (hold Ctrl for the cursor).

GUIFlash labels cannot fade: a label the layer covers (its `cover` prop, `core.hud.cover.flash_visible`) is hidden until
the stock overlay closes.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ....events import Listeners
from ....hud import HudBackend
from ....hud.cover import flash_visible
from ....hud.panel import GAMEFACE_PROPS
from ....hud.surface import SPACE_BATTLE, SPACE_LOBBY
from ....log import log, safe
from ..space import current_space
from .constants import LABEL_PROPS, SPACE_ARGUMENT

try:
    from gui.mods.gambiter import g_guiFlash
    from gui.mods.gambiter.flash import COMPONENT_TYPE
    IMPORT_ERROR = None
except Exception as error:  # any failure inside a third-party import must not stop the core
    g_guiFlash = None
    COMPONENT_TYPE = None
    IMPORT_ERROR = error

try:
    from gui.mods.gambiter.flash import COMPONENT_EVENT
except Exception:
    COMPONENT_EVENT = None


# Whether `createComponent` takes the 0.6 `battle`/`lobby` arguments.
def accepts_spaces(method):
    code = getattr(getattr(method, '__func__', method), '__code__', None)
    return code is not None and SPACE_ARGUMENT in code.co_varnames[:code.co_argcount]


def flash_props(props):
    return dict((key, value) for key, value in (props or {}).items() if key not in GAMEFACE_PROPS)


class GuiFlashBackend(HudBackend):

    name = 'guiflash'

    def __init__(self):
        self.listeners = Listeners('HUD move listener')
        self.listening = False
        self.covers = {}
        self.spaces = accepts_spaces(getattr(g_guiFlash, 'createComponent', None))

    @classmethod
    def usable(cls):
        return g_guiFlash is not None and COMPONENT_TYPE is not None

    @classmethod
    def missing_reason(cls):
        return 'GUIFlash: %s' % (IMPORT_ERROR or 'not installed')

    def available(self):
        return self.usable() and (self.spaces or current_space() == SPACE_BATTLE)

    @safe
    def create(self, alias, props):
        self.covers[alias] = {}
        props = dict(LABEL_PROPS, **flash_props(flash_visible(self.covers[alias], props)))
        if self.spaces:
            space = current_space()
            g_guiFlash.createComponent(
                alias,
                COMPONENT_TYPE.LABEL,
                props,
                battle=space == SPACE_BATTLE,
                lobby=space == SPACE_LOBBY,
            )
        else:
            g_guiFlash.createComponent(alias, COMPONENT_TYPE.LABEL, props)
        return True

    @safe
    def update(self, alias, props):
        g_guiFlash.updateComponent(alias, flash_props(flash_visible(self.covers.setdefault(alias, {}), props)))
        return True

    @safe
    def delete(self, alias):
        self.covers.pop(alias, None)
        g_guiFlash.deleteComponent(alias)
        return True

    @safe
    def listen(self, on_moved):
        self.listeners.add(on_moved)
        updated = getattr(COMPONENT_EVENT, 'UPDATED', None)
        if updated is None or self.listening:
            return
        updated += self._on_updated
        self.listening = True
        log('HUD: GUIFlash %s' % ('with hangar labels' if self.spaces else 'in battle only (a pre-0.6 build)'))

    @safe
    def _on_updated(self, alias, props):
        self.listeners.notify(alias, props if isinstance(props, dict) else {})
