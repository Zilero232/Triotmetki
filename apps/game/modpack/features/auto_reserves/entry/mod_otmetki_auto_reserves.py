from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.auto_reserves import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register auto_reserves\n') + traceback.format_exc())
