from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.companion.app.client import start
    start()
except Exception:
    print(str('[OTMETKI] failed to start\n') + traceback.format_exc())


# UNVERIFIED on Lesta 1.45: the mod loader (gui/mods/__init__.py) calls fini() at shutdown.
def fini():
    try:
        from gui.mods.otmetki.companion.app.client import stop
        stop()
    except Exception:
        print(str('[OTMETKI] failed to stop\n') + traceback.format_exc())
