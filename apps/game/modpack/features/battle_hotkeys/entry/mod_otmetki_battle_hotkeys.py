from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.battle_hotkeys import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register battle_hotkeys\n') + traceback.format_exc())
