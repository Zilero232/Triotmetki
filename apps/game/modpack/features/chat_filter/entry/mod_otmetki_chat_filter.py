from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.chat_filter import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register chat_filter\n') + traceback.format_exc())
