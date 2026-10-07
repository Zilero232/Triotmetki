from __future__ import absolute_import, division, print_function, unicode_literals

import re

# The dev install's list of component ids to shoot (catalog/previews/CAPTURE.md): {"ids": [...], "current": "<id>"}.
CAPTURE_FILE = 'capture.json'
IDS_KEY = 'ids'
CURRENT_KEY = 'current'
ID_PATTERN = re.compile(r'^[a-z][a-z0-9_]*$')
# (Keys name, modifiers held with it), core.client.hotkey.
SHOT_HOTKEY = ('KEY_F12', ('KEY_LCONTROL', 'KEY_LSHIFT'))
NEXT_HOTKEY = ('KEY_F11', ('KEY_LCONTROL', 'KEY_LSHIFT'))
# RU 1.45 res/engine_config.xml screenShot: name "screenshots/shot", extension "jpg"; the engine appends _NNN
# (screenshots/shot_001.jpg). PNG keeps the crops lossless for tools/build/previews/capture.
SHOT_EXTENSION = 'png'
SHOT_NAME = 'screenshots/otmetki_%s'
