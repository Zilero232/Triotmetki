from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.damage_log import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register damage_log\n') + traceback.format_exc())
