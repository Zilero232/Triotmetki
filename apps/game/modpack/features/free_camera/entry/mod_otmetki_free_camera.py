from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.free_camera import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register free_camera\n') + traceback.format_exc())
