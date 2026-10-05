from __future__ import absolute_import, division, print_function, unicode_literals

import os

# The app's CONFIG_DIR (companion/app/constants.py): the play request is written and read before the app exists.
BOOT_CONFIG_DIR = os.path.join('mods', 'configs', 'otmetki')
# The client's own settings window saves the preferences and restarts after a short delay
# (gui/Scaleform/daapi/view/common/settings/SettingsWindow.py:114-130, RU 1.45 client source).
RESTART_DELAY_S = 0.3
# The file system encoding of a Windows Python 2 when the interpreter names none.
FALLBACK_ENCODING = 'mbcs'
# The value the window sends with the favourite action for 'on'.
FAVOURITE_ON = '1'
