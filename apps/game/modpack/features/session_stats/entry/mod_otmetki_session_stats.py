from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.session_stats import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register session_stats\n') + traceback.format_exc())
