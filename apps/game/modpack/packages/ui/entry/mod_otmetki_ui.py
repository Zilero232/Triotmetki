from __future__ import absolute_import, division, print_function, unicode_literals

import traceback

try:
    from gui.mods.otmetki.ui import register
    register()
except Exception:
    print(str('[OTMETKI] failed to register ui\n') + traceback.format_exc())

try:
    from gui.mods.otmetki.companion.config import is_dev_install
    from gui.mods.otmetki.core.client.inject.spike import start as start_inject_spike
    start_inject_spike(is_dev_install())
except Exception:
    print(str('[OTMETKI] failed to start the inject spike\n') + traceback.format_exc())
