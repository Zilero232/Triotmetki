from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import service
from ....core.client.lobby_view import hidden_layers
from ....core.log import log
from .constants import (
    CAMERA_SECTION,
    FALLBACK_MODE,
    INPUT_HANDLER_CFG,
    PREVIOUS_ARGS_ATTR,
    PREVIOUS_MODE_ATTR,
    VIDEO_MODE_SECTION,
)


def _camera_section():
    import ResMgr
    root = ResMgr.openSection(INPUT_HANDLER_CFG)
    video = root[VIDEO_MODE_SECTION] if root is not None else None
    section = video[CAMERA_SECTION] if video is not None else None
    return section if section is not None else ResMgr.DataSection(CAMERA_SECTION)


# The client's VideoCamera over the hangar: it takes over BigWorld.camera() and gets the keys and the mouse the
# component hands it; `stop()` gives the hangar camera back.
class HangarFlight(object):
    def __init__(self):
        self.camera = None
        self.previous = None

    def start(self):
        import BigWorld
        from AvatarInputHandler.VideoCamera import VideoCamera
        self.previous = BigWorld.camera()
        camera = VideoCamera(_camera_section())
        camera.create()
        camera.enable(camMatrix=BigWorld.camera().matrix)
        self.camera = camera
        return True

    def stop(self):
        import BigWorld
        camera = self.camera
        self.camera = None
        if camera is not None:
            camera.disable()
            camera.destroy()
        if self.previous is not None:
            BigWorld.camera(self.previous)
        self.previous = None

    # The battle has its own camera by now and the hangar is gone: the video camera is dropped without disable()
    # (it resets the FOV) and the hangar camera is not given back.
    def drop(self):
        camera = self.camera
        self.camera = None
        if camera is not None:
            camera.destroy()
        self.previous = None

    def key(self, key, is_down):
        return bool(self.camera is not None and self.camera.handleKeyEvent(key, is_down))

    def mouse(self, dx, dy, dz):
        if self.camera is not None:
            self.camera.handleMouseEvent(dx, dy, dz)


def _input_handler():
    import BigWorld
    return getattr(BigWorld.player(), 'inputHandler', None)


# The replay's own video control mode (the one Caps+F3 opens in a developer build): the avatar's input handler flies it
# with its keys; `stop()` goes back to the mode it came from.
class ReplayFlight(object):
    def start(self):
        import BigWorld
        from aih_constants import CTRL_MODE_NAME
        handler = _input_handler()
        if handler is None or not handler.isControlModeChangeAllowed():
            log('free camera: the replay does not allow a camera change now')
            return False
        previous = handler.ctrlModeName
        handler.onControlModeChanged(CTRL_MODE_NAME.VIDEO, prevModeName=previous, camMatrix=BigWorld.camera().matrix)
        return True

    def stop(self):
        from aih_constants import CTRL_MODE_NAME
        handler = _input_handler()
        if handler is None or handler.ctrlModeName != CTRL_MODE_NAME.VIDEO:
            return
        control = handler.ctrl
        previous = getattr(control, PREVIOUS_MODE_ATTR, None) or FALLBACK_MODE
        args = getattr(control, PREVIOUS_ARGS_ATTR, None) or {}
        handler.onControlModeChanged(previous, **args)


def toggle_battle_gui():
    from gui.battle_control import event_dispatcher
    event_dispatcher.toggleGUIVisibility()


def set_lobby_gui(visible):
    from skeletons.gui.app_loader import IAppLoader
    loader = service(IAppLoader)
    lobby = loader.getDefLobbyApp() if loader is not None else None
    if lobby is None:
        return False
    layers = hidden_layers()
    if visible:
        lobby.containerManager.showContainers(layers, 0)
    else:
        lobby.containerManager.hideContainers(layers, 0)
    return True
