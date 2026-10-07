from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.auto_messages import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register auto_messages\n') + traceback.format_exc())
