from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.companion.app.client import start
    start()
except Exception:
    print(str('[OTMETKI] failed to start\n') + traceback.format_exc())
