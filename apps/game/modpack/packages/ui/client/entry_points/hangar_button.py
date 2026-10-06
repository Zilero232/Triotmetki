from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import panel_schema
from ....core.hud.panel import moved_values
from ....core.log import log, safe
from ...window_layout import unmoved_layout
from ..constants import BUTTON_ALIAS, BUTTON_DEFAULTS, BUTTON_LAYOUT_KEYS, BUTTON_OLD_DEFAULTS, BUTTON_SECTION


def _hud_config(app):
    try:
        from ....core.client.hud import component_config
    except ImportError:
        return None
    return component_config(app)


# The settings button is a panel of the Gameface HUD page (the same full-screen page as the hangar labels), docked
# under the hangar's top bar and moved like every panel with the edit modifier. A child view injected into a
# client widget (the 1.45 crew widget) drew it in the widget's box, mid-screen, and its click could not reach
# the model. It is the fallback entry: with ModsList installed the entry sits in the stock bottom-right row and this
# button is not drawn; without the Gameface HUD page Ctrl+Shift+T opens the window.
class HangarButton(object):

    def __init__(self, app, on_open):
        self.app = app
        self.on_open = on_open
        self.settings = None
        self.shown = False

    @safe
    def install(self):
        config = _hud_config(self.app)
        if config is None:
            return False
        if self.settings is None:
            self.settings = config.section(BUTTON_SECTION, panel_schema(BUTTON_DEFAULTS))
            moved = unmoved_layout(self.settings.to_dict(), BUTTON_OLD_DEFAULTS, BUTTON_DEFAULTS)
            if moved:
                config.update(BUTTON_SECTION, moved)
        return self.show()

    def layout(self):
        settings = self.settings
        return {
            'x': settings.get('x'),
            'y': settings.get('y'),
            'alignX': settings.get('align_x'),
            'alignY': settings.get('align_y'),
            'scale': round(settings.get('scale') / 100, 2),
        }

    @safe
    def show(self):
        if self.settings is None or self.app.in_battle:
            return False
        shown = bool(self.app.ui.button(BUTTON_ALIAS, self.layout(), self.on_open, self.save))
        if shown != self.shown:
            self.shown = shown
            where = 'on the Gameface HUD page' if shown else 'not drawn (no Gameface HUD page), use Ctrl+Shift+T'
            log('ui: hangar button %s' % where)
        return shown

    def save(self, props):
        config = _hud_config(self.app)
        if config is not None:
            config.update(BUTTON_SECTION, moved_values(props))

    @safe
    def reset(self):
        config = _hud_config(self.app)
        if config is None or self.settings is None:
            return
        defaults = self.settings.schema.defaults
        config.update(BUTTON_SECTION, {key: defaults[key] for key in BUTTON_LAYOUT_KEYS})
        self.app.ui.place(BUTTON_ALIAS, self.layout())
