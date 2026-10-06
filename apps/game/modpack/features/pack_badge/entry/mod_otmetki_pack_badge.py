from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.pack_badge import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register pack_badge\n') + traceback.format_exc())
