from __future__ import absolute_import, division, print_function, unicode_literals

import re

CAPTURE_FILE = 'capture.json'
IDS_KEY = 'ids'
CURRENT_KEY = 'current'
ID_PATTERN = re.compile(r'^[a-z][a-z0-9_]*$')
SHOT_HOTKEY = ('KEY_F12', ('KEY_LCONTROL', 'KEY_LSHIFT'))
NEXT_HOTKEY = ('KEY_F11', ('KEY_LCONTROL', 'KEY_LSHIFT'))
# RU 1.45 res/engine_config.xml screenShot: the engine appends _NNN to the name.
SHOT_EXTENSION = 'png'
SHOT_NAME = 'screenshots/otmetki_%s'
