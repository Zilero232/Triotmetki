from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: AvatarInputHandler.INPUT_HANDLER_CFG and its <videoMode><camera> section, the settings the
# client's own video camera (replays, the developer build) reads: WASD, Q/E up and down, the mouse and the wheel.
INPUT_HANDLER_CFG = 'gui/avatar_input_handler.xml'
VIDEO_MODE_SECTION = 'videoMode'
CAMERA_SECTION = 'camera'
# control_modes.VideoCameraControlMode keeps where it came from in these (name-mangled) attributes; its own
# Caps+F3 goes back through them.
PREVIOUS_MODE_ATTR = '_VideoCameraControlMode__prevModeName'
PREVIOUS_ARGS_ATTR = '_VideoCameraControlMode__previousArgs'
FALLBACK_MODE = 'arcade'
ESCAPE_KEY = 'KEY_ESCAPE'
