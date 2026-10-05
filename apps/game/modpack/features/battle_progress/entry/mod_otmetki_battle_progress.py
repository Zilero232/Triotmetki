from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.battle_progress import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register battle_progress\n') + traceback.format_exc())
