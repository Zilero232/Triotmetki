from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.personal_missions import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register personal_missions\n') + traceback.format_exc())
