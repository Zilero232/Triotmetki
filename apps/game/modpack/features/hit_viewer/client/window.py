from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import lobby_app
from ....core.log import guarded, safe
from .constants import (
    BACKGROUND_ALPHA,
    INVALID_RES_ID,
    MESSAGE_ARG,
    RES_MAP_ID,
    SEND_COMMAND,
    STATE_PROPERTY,
)

# OpenWG Gameface registers the page (the ui package's res_map); the view is the client's wulf ViewImpl, loaded as a
# lobby sub view the way the stock Gameface views over the 3D hangar are (constants.BACKGROUND_ALPHA).
try:
    from frameworks.wulf import ViewFlags, ViewModel, ViewSettings
    from gui.impl.pub import ViewImpl
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
    return getattr(lobby_app(), 'gameInputManager', None)


def set_header_menu(visible):
    from gui.Scaleform.daapi.view.lobby.header.LobbyHeader import HeaderMenuVisibilityState
    from gui.shared import EVENT_BUS_SCOPE, events, g_eventBus
    state = HeaderMenuVisibilityState.ALL if visible else HeaderMenuVisibilityState.NOTHING
    event = events.LobbyHeaderMenuEvent(events.LobbyHeaderMenuEvent.TOGGLE_VISIBILITY, ctx={'state': state})
    g_eventBus.handleEvent(event, scope=EVENT_BUS_SCOPE.LOBBY)


# RU 1.45 maps_training_base_view._onMoveSpace turns and zooms the hangar camera with the same event.
def move_camera(dx, dy, dz):
    from gui.hangar_cameras.hangar_camera_common import CameraRelatedEvents
    from gui.shared import EVENT_BUS_SCOPE, g_eventBus
    event = CameraRelatedEvents(CameraRelatedEvents.LOBBY_VIEW_MOUSE_MOVE, ctx={'dx': dx, 'dy': dy, 'dz': dz})
    g_eventBus.handleEvent(event, EVENT_BUS_SCOPE.GLOBAL)


def show_hangar():
    from gui.shared.event_dispatcher import showHangar
    showHangar()


@guarded('hit viewer: late view')
def destroy_view(view):
    view.destroy()


if AVAILABLE:

    class ViewerModel(ViewModel):

        def __init__(self, properties=1, commands=1):
            super(ViewerModel, self).__init__(properties=properties, commands=commands)

        def _initialize(self):
            super(ViewerModel, self)._initialize()
            self._addStringProperty(STATE_PROPERTY, '')
            self.send = self._addCommand(SEND_COMMAND)

        def set_state(self, text):
            self._setString(0, text)

    class ViewerView(ViewImpl):

        def __init__(self, layoutID, controller=None):
            settings = ViewSettings(layoutID, flags=ViewFlags.LOBBY_SUB_VIEW, model=ViewerModel())
            super(ViewerView, self).__init__(settings)
            self.controller = controller

        @property
        def viewModel(self):
            return super(ViewerView, self).getViewModel()

        def _initialize(self, *args, **kwargs):
            super(ViewerView, self)._initialize(*args, **kwargs)
            self._step_aside(False)

        def _onLoading(self, *args, **kwargs):
            super(ViewerView, self)._onLoading(*args, **kwargs)
            self.viewModel.send += self._on_send
            self.controller.on_loaded(self)

        def _finalize(self):
            self.viewModel.send -= self._on_send
            self._step_aside(True)
            self.controller.on_destroyed(self)
            super(ViewerView, self)._finalize()

        @staticmethod
        @guarded('hit viewer: lobby header')
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
        params = GuiImplViewLoadParams(layout, ViewerView, ScopeTemplates.LOBBY_SUB_SCOPE)
        g_eventBus.handleEvent(events.LoadGuiImplViewEvent(params, controller=controller), scope=EVENT_BUS_SCOPE.LOBBY)

else:
    load_view = None


class ViewerWindowHost(object):

    def __init__(self, on_message, on_escape, on_ready, on_gone):
        self.on_message_cb = on_message
        self.on_escape = on_escape
        self.on_ready = on_ready
        self.on_gone = on_gone
        self.is_open = False
        self.view = None
        self.retired = []
        self.escape_manager = None
        self.pushed = None

    @staticmethod
    def available():
        return AVAILABLE and layout_id() is not None

    def open(self):
        layout = layout_id()
        if not AVAILABLE or layout is None:
            return False
        load_view(layout, self)
        self.is_open = True
        self._hold_escape()
        return True

    # A battle queue (RU 1.45 VIEW_ALIAS.BATTLE_QUEUE, a SUB_VIEW) replaces the sub view by itself: loading the hangar
    # view then would cover the queue.
    @safe
    def close(self, restore_hangar=True):
        was_open = self.is_open
        if self.view is not None:
            self.retired.append(self.view)
        self.is_open, self.view, self.pushed = False, None, None
        self._release_escape()
        if was_open and restore_hangar:
            show_hangar()

    def push_state(self, text):
        if self.view is None or self.pushed == text:
            return
        self.pushed = text
        self.view.viewModel.set_state(text)

    # A view that loads after close() is destroyed at once: its _finalize gives the lobby header back.
    def on_loaded(self, view):
        if not self.is_open:
            self.retired.append(view)
            destroy_view(view)
            return

        self.view, self.pushed = view, None
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
        self.is_open, self.view = False, None
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
