from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: AvatarInputHandler.INPUT_HANDLER_CFG <videoMode><camera>.
INPUT_HANDLER_CFG = 'gui/avatar_input_handler.xml'
VIDEO_MODE_SECTION = 'videoMode'
CAMERA_SECTION = 'camera'
# control_modes.VideoCameraControlMode keeps its origin in these name-mangled attributes.
PREVIOUS_MODE_ATTR = '_VideoCameraControlMode__prevModeName'
PREVIOUS_ARGS_ATTR = '_VideoCameraControlMode__previousArgs'
FALLBACK_MODE = 'arcade'
ESCAPE_KEY = 'KEY_ESCAPE'
# RU 1.45 PlayerEvents: the lobby account leaves (a battle, a server switch) or the connection drops.
ACCOUNT_LEFT_EVENTS = ('onAccountBecomeNonPlayer', 'onDisconnected')
