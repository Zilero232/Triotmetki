from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import main_window
from ....core.log import safe
from ...protocol import ESCAPE_PROPERTY, FEED_PROPERTY, MESSAGE_ARG, RES_MAP_WINDOW, SEND_COMMAND, STATE_PROPERTY
from .constants import WINDOW_LAYER

# UNVERIFIED on Lesta 1.45: OpenWG Gameface API names follow docs.wotstat.info.
try:
    from frameworks.wulf import ViewFlags, ViewModel, ViewSettings, WindowFlags, WindowLayer, WindowStatus
    from gui.impl.pub import ViewImpl, WindowImpl
    from openwg_gameface import ModDynAccessor
    AVAILABLE = True
except ImportError:
    AVAILABLE = False

# Module-level accessors: a plain function stored on a class would become an unbound method on Python 2.
SETTINGS_LAYOUT = ModDynAccessor(RES_MAP_WINDOW) if AVAILABLE else None


def message_of(args):
    if isinstance(args, dict):
        return args.get(MESSAGE_ARG)
    getter = getattr(args, 'get', None)
    return getter(MESSAGE_ARG) if getter is not None else None


if AVAILABLE:

    class SettingsViewModel(ViewModel):

        def __init__(self, properties=3, commands=1):
            super(SettingsViewModel, self).__init__(properties=properties, commands=commands)

        def _initialize(self):
            super(SettingsViewModel, self)._initialize()
            self._addStringProperty(STATE_PROPERTY, '')
            self._addStringProperty(FEED_PROPERTY, '')
            self._addNumberProperty(ESCAPE_PROPERTY, 0)
            self.send = self._addCommand(SEND_COMMAND)

        def set_state(self, text):
            self._setString(0, text)

        def set_feed(self, text):
            self._setString(1, text)

        def set_escape(self, asked):
            self._setNumber(2, asked)

    class SettingsGameView(ViewImpl):

        def __init__(self, controller):
            settings = ViewSettings(SETTINGS_LAYOUT(), flags=ViewFlags.VIEW, model=SettingsViewModel())
            super(SettingsGameView, self).__init__(settings)
            self.controller = controller

        @property
        def viewModel(self):
            return super(SettingsGameView, self).getViewModel()

        def _onLoading(self, *args, **kwargs):
            super(SettingsGameView, self)._onLoading(*args, **kwargs)
            self.viewModel.send += self._on_send
            self.controller.on_loaded(self)

        def _finalize(self):
            self.viewModel.send -= self._on_send
            self.controller.on_destroyed(self)
            super(SettingsGameView, self)._finalize()

        @safe
        def _on_send(self, args=None):
            self.controller.on_message(message_of(args))

    class SettingsWindow(WindowImpl):

        def __init__(self, controller):
            super(SettingsWindow, self).__init__(
                wndFlags=WindowFlags.WINDOW | WindowFlags.WINDOW_FULLSCREEN,
                content=SettingsGameView(controller),
                layer=getattr(WindowLayer, WINDOW_LAYER),
                parent=main_window(),
            )

else:
    SettingsWindow = None
    WindowStatus = None
