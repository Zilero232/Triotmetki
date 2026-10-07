from __future__ import absolute_import, division, print_function, unicode_literals

import os

BOOT_CONFIG_DIR = os.path.join('mods', 'configs', 'otmetki')
# RU 1.45 client source: common/settings/SettingsWindow.py:114-130 saves and restarts after a delay.
RESTART_DELAY_S = 0.3
# The file system encoding of a Windows Python 2 when the interpreter names none.
FALLBACK_ENCODING = 'mbcs'
FAVOURITE_ON = '1'
