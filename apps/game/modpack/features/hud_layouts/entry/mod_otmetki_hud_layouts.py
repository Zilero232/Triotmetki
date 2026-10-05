from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.hud_layouts import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register hud_layouts\n') + traceback.format_exc())
