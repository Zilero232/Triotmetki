from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import main_window
from ....core.log import safe
from .constants import (
    INVALID_RES_ID,
    MARKS_PROPERTY,
    MESSAGE_ARG,
    RES_MAP_ID,
    SEND_COMMAND,
    STATE_PROPERTY,
    WINDOW_LAYER,
)

# OpenWG Gameface registers the page (the ui package's res_map); the window is the client's wulf WindowImpl +
# ViewImpl, as the settings window and the HUD page use them.
try:
    from frameworks.wulf import ViewFlags, ViewModel, ViewSettings, WindowFlags, WindowLayer, WindowStatus
    from gui.impl.pub import ViewImpl, WindowImpl
    import openwg_gameface
    AVAILABLE = True
except Exception:  # any failure inside a third-party import must not stop the feature
    openwg_gameface = None
    AVAILABLE = False


def layout_id():
    finder = getattr(openwg_gameface, 'res_id_by_key', None)
    if finder is None:
        return None
    try:
        found = finder(RES_MAP_ID)
    except Exception:
        return None
    return found if isinstance(found, int) and found != INVALID_RES_ID else None


def message_of(args):
    if isinstance(args, dict):
        return args.get(MESSAGE_ARG)
    getter = getattr(args, 'get', None)
    return getter(MESSAGE_ARG) if getter is not None else None


def input_manager():
    try:
        from helpers import dependency
        from skeletons.gui.app_loader import IAppLoader
    except ImportError:
        return None
    return getattr(dependency.instance(IAppLoader).getApp(), 'gameInputManager', None)


if AVAILABLE:

    class ViewerModel(ViewModel):

        def __init__(self, properties=2, commands=1):
            super(ViewerModel, self).__init__(properties=properties, commands=commands)

        def _initialize(self):
            super(ViewerModel, self)._initialize()
            self._addStringProperty(STATE_PROPERTY, '')
            self._addStringProperty(MARKS_PROPERTY, '')
            self.send = self._addCommand(SEND_COMMAND)

        def set_state(self, text):
            self._setString(0, text)

        def set_marks(self, text):
            self._setString(1, text)

    class ViewerView(ViewImpl):

        def __init__(self, layout, controller):
            super(ViewerView, self).__init__(ViewSettings(layout, flags=ViewFlags.VIEW, model=ViewerModel()))
            self.controller = controller

        @property
        def viewModel(self):
            return super(ViewerView, self).getViewModel()

        def _onLoading(self, *args, **kwargs):
            super(ViewerView, self)._onLoading(*args, **kwargs)
            self.viewModel.send += self._on_send
            self.controller.on_loaded(self)

        def _finalize(self):
            self.viewModel.send -= self._on_send
            self.controller.on_destroyed(self)
            super(ViewerView, self)._finalize()

        @safe
        def _on_send(self, args=None):
            self.controller.on_message(message_of(args))

    class ViewerWindow(WindowImpl):

        def __init__(self, layout, controller):
            super(ViewerWindow, self).__init__(wndFlags=WindowFlags.WINDOW, content=ViewerView(layout, controller),
                                               layer=getattr(WindowLayer, WINDOW_LAYER), parent=main_window())

else:
    ViewerWindow = None
    WindowStatus = None


class ViewerWindowHost(object):
    """The viewer's Gameface window: opened over the hangar, its page pushed `state` and `marks`, Esc held while it is
    open (the client's game input manager, as the settings window holds it)."""

    def __init__(self, on_message, on_escape, on_ready, on_gone):
        self.on_message_cb = on_message
        self.on_escape = on_escape
        self.on_ready = on_ready
        self.on_gone = on_gone
        self.window = None
        self.view = None
        self.escape_manager = None
        self.pushed = {}

    @staticmethod
    def available():
        return AVAILABLE and layout_id() is not None

    @property
    def is_open(self):
        return self.window is not None

    def open(self):
        layout = layout_id()
        if not AVAILABLE or layout is None:
            return False
        self.window = ViewerWindow(layout, self)
        self.window.load()
        self._hold_escape()
        return True

    @safe
    def close(self):
        window, self.window, self.view = self.window, None, None
        self.pushed = {}
        self._release_escape()
        if window is not None and window.windowStatus not in (WindowStatus.DESTROYING, WindowStatus.DESTROYED):
            window.destroy()

    def push_state(self, text):
        self._push(STATE_PROPERTY, text)

    def push_marks(self, text):
        self._push(MARKS_PROPERTY, text)

    def _push(self, name, text):
        if self.view is None or self.pushed.get(name) == text:
            return
        self.pushed[name] = text
        model = self.view.viewModel
        if name == STATE_PROPERTY:
            model.set_state(text)
        else:
            model.set_marks(text)

    def on_loaded(self, view):
        self.view, self.pushed = view, {}
        self.on_ready()

    # The client destroys the window itself with the lobby (a battle that starts without a queue, a logout): the
    # screen still has its ticker and the swapped hangar vehicle to give back.
    def on_destroyed(self, view):
        if self.view is view:
            self.view = None
            self.window = None
            self._release_escape()
            self.on_gone()

    def on_message(self, raw):
        self.on_message_cb(raw)

    def _hold_escape(self):
        manager = input_manager()
        if manager is None or not hasattr(manager, 'addEscapeListener'):
            return
        manager.addEscapeListener(self._escape)
        self.escape_manager = manager

    def _release_escape(self):
        manager, self.escape_manager = self.escape_manager, None
        if manager is not None:
            manager.removeEscapeListener(self._escape)

    @safe
    def _escape(self, *args):
        self.on_escape()
