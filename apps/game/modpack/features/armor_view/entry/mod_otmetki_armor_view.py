from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.armor_view import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register armor_view\n') + traceback.format_exc())
