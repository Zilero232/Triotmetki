from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.features.hit_viewer import register
    register()
except Exception:
    print('[OTMETKI] failed to register hit_viewer\n%s' % traceback.format_exc())
