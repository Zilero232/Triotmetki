from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.aim_info import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register aim_info\n') + traceback.format_exc())
