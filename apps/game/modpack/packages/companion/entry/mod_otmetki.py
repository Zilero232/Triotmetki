from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.companion.app.client import start
    start()
except Exception:
    print(str('[OTMETKI] failed to start\n') + traceback.format_exc())


# The client's mod loader (gui/mods/__init__.py) calls each mod_*'s fini() while the game shuts down (UNVERIFIED on
# Lesta 1.45); onDisconnected and every space change flush the held saves as well.
def fini():
    try:
        from gui.mods.otmetki.companion.app.client import stop
        stop()
    except Exception:
        print(str('[OTMETKI] failed to stop\n') + traceback.format_exc())
