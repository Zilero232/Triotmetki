from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.quick_demount import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register quick_demount\n') + traceback.format_exc())
