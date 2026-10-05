from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.streamer_mode import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register streamer_mode\n') + traceback.format_exc())
