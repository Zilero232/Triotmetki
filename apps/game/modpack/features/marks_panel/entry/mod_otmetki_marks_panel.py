from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.marks_panel import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register marks_panel\n') + traceback.format_exc())
