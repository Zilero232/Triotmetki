"""The client side of `core.sub_view`: a Gameface page loaded as a lobby sub view over the 3D hangar.

OpenWG Gameface registers the page (the ui package's res_map); the view is the client's wulf `ViewImpl`, loaded with
`LoadGuiImplViewEvent(GuiImplViewLoadParams(layout, view class, ScopeTemplates.LOBBY_SUB_SCOPE))` the way the stock
Gameface views over the 3D hangar are (constants.BACKGROUND_ALPHA). `SubViewHost` opens and closes one such page, holds
Esc while it is open, pushes its string properties and hands its messages and its life cycle to the feature's screen.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ...inject import PAGE_SEND_COMMAND, message_of, valid_layout
from ...log import guarded, safe
from ..game import lobby_app
from .constants import BACKGROUND_ALPHA, MODEL_CLASS_NAME

try:
    from frameworks.wulf import ViewFlags, ViewModel, ViewSettings
    from gui.impl.pub import ViewImpl
    import openwg_gameface
    AVAILABLE = True
except Exception:  # any failure inside a third-party import must not stop the feature
    openwg_gameface = None
    AVAILABLE = False

_model_classes = {}


def layout_id(key):
    """The layout id OpenWG Gameface gave the res_map item `key`, or None until it validated its res_map."""
    finder = getattr(openwg_gameface, 'res_id_by_key', None)
    if finder is None:
        return None
    try:
        found = finder(key)
    except Exception:
        return None
    return valid_layout(found)


def input_manager():
    return getattr(lobby_app(), 'gameInputManager', None)


def set_header_menu(visible):
    from gui.Scaleform.daapi.view.lobby.header.LobbyHeader import HeaderMenuVisibilityState
    from gui.shared import EVENT_BUS_SCOPE, events, g_eventBus
    state = HeaderMenuVisibilityState.ALL if visible else HeaderMenuVisibilityState.NOTHING
    event = events.LobbyHeaderMenuEvent(events.LobbyHeaderMenuEvent.TOGGLE_VISIBILITY, ctx={'state': state})
    g_eventBus.handleEvent(event, scope=EVENT_BUS_SCOPE.LOBBY)


def move_camera(dx, dy, dz):
    """Turns and zooms the hangar camera the way RU 1.45 maps_training_base_view._onMoveSpace does."""
    from gui.hangar_cameras.hangar_camera_common import CameraRelatedEvents
    from gui.shared import EVENT_BUS_SCOPE, g_eventBus
    event = CameraRelatedEvents(CameraRelatedEvents.LOBBY_VIEW_MOUSE_MOVE, ctx={'dx': dx, 'dy': dy, 'dz': dz})
    g_eventBus.handleEvent(event, EVENT_BUS_SCOPE.GLOBAL)


def show_hangar():
    from gui.shared.event_dispatcher import showHangar
    showHangar()


@guarded('sub view: late view')
def destroy_view(view):
    view.destroy()


if AVAILABLE:

    class SubViewModel(ViewModel):

        PROPERTIES = ()

        def __init__(self):
            super(SubViewModel, self).__init__(properties=len(self.PROPERTIES), commands=1)

        def _initialize(self):
            super(SubViewModel, self)._initialize()
            for name in self.PROPERTIES:
                self._addStringProperty(name, '')
            self.send = self._addCommand(PAGE_SEND_COMMAND)

        def set_text(self, index, text):
            self._setString(index, text)

    # One model class per set of properties: wulf builds the model's properties in _initialize, inside __init__.
    def model_class(properties):
        found = _model_classes.get(properties)
        if found is None:
            found = type(str(MODEL_CLASS_NAME), (SubViewModel,), {'PROPERTIES': properties})
            _model_classes[properties] = found
        return found

    class SubView(ViewImpl):

        def __init__(self, layoutID, controller=None):
            model = model_class(controller.page.properties)()
            settings = ViewSettings(layoutID, flags=ViewFlags.LOBBY_SUB_VIEW, model=model)
            super(SubView, self).__init__(settings)
            self.controller = controller

        @property
        def viewModel(self):
            return super(SubView, self).getViewModel()

        def _initialize(self, *args, **kwargs):
            super(SubView, self)._initialize(*args, **kwargs)
            self._step_aside(False)

        def _onLoading(self, *args, **kwargs):
            super(SubView, self)._onLoading(*args, **kwargs)
            self.viewModel.send += self._on_send
            self.controller.on_loaded(self)

        def _finalize(self):
            self.viewModel.send -= self._on_send
            self._step_aside(True)
            self.controller.on_destroyed(self)
            super(SubView, self)._finalize()

        @staticmethod
        @guarded('sub view: lobby header')
        def _step_aside(is_back):
            if not is_back:
                lobby_app().setBackgroundAlpha(BACKGROUND_ALPHA)
            set_header_menu(is_back)

        @safe
        def _on_send(self, args=None):
            self.controller.on_message(message_of(args))

    def load_view(layout, controller):
        from gui.Scaleform.framework import ScopeTemplates
        from gui.Scaleform.framework.managers.loaders import GuiImplViewLoadParams
        from gui.shared import EVENT_BUS_SCOPE, events, g_eventBus
        params = GuiImplViewLoadParams(layout, SubView, ScopeTemplates.LOBBY_SUB_SCOPE)
        g_eventBus.handleEvent(events.LoadGuiImplViewEvent(params, controller=controller), scope=EVENT_BUS_SCOPE.LOBBY)

else:
    load_view = None


class SubViewHost(object):
    """One page (`core.sub_view.SubViewPage`) as a lobby sub view: `open()` loads it, `close()` gives the stock hangar
    view back, `push(name, text)` sets one of its string properties (unchanged text is not sent again). The screen
    gets `on_message(raw)`, `on_escape()`, `on_ready()` once the view loaded and `on_gone()` when the client replaced
    the view itself."""

    def __init__(self, page, on_message, on_escape, on_ready, on_gone):
        self.page = page
        self.on_message_cb = on_message
        self.on_escape = on_escape
        self.on_ready = on_ready
        self.on_gone = on_gone
        self.is_open = False
        self.view = None
        self.retired = []
        self.escape_manager = None
        self.pushed = {}

    def available(self):
        return AVAILABLE and layout_id(self.page.key) is not None

    def open(self):
        layout = layout_id(self.page.key)
        if not AVAILABLE or layout is None:
            return False
        self.is_open = True
        self._hold_escape()
        load_view(layout, self)
        return True

    # A battle queue (RU 1.45 VIEW_ALIAS.BATTLE_QUEUE, a SUB_VIEW) replaces the sub view by itself: loading the hangar
    # view then would cover the queue.
    @safe
    def close(self, restore_hangar=True):
        was_open = self.is_open
        if self.view is not None:
            self.retired.append(self.view)
        self.is_open = False
        self.view = None
        self.pushed = {}
        self._release_escape()
        if was_open and restore_hangar:
            show_hangar()

    def push(self, name, text):
        if self.view is None or self.pushed.get(name) == text:
            return
        self.pushed[name] = text
        index = self.page.properties.index(name)
        self.view.viewModel.set_text(index, text)

    def push_state(self, text):
        self.push(self.page.properties[0], text)

    # A view that loads after close() is destroyed at once: its _finalize gives the lobby header back.
    def on_loaded(self, view):
        if not self.is_open:
            self.retired.append(view)
            destroy_view(view)
            return

        self.view = view
        self.pushed = {}
        self.on_ready()

    # The client replaces the sub view itself (a header tab, a battle that starts without a queue, a logout): the
    # screen still has the swapped hangar vehicle to give back.
    def on_destroyed(self, view):
        if view in self.retired:
            self.retired.remove(view)
            return
        is_other_view = self.view is not None and self.view is not view
        if not self.is_open or is_other_view:
            return
        self.is_open = False
        self.view = None
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
        manager = self.escape_manager
        self.escape_manager = None
        if manager is not None:
            manager.removeEscapeListener(self._escape)

    @safe
    def _escape(self, *args):
        self.on_escape()
