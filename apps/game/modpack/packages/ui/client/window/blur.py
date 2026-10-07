from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source (gui/shared/view_helpers/blur_manager.py), `ownLayer=self.layer - 1`.
try:
    from gui.shared.view_helpers.blur_manager import CachedBlur
except ImportError:
    CachedBlur = None


class WindowBlur(object):

    def __init__(self):
        self.blur = None

    def show(self, window_layer):
        if CachedBlur is None or self.blur is not None:
            return
        self.blur = CachedBlur(enabled=True, ownLayer=window_layer - 1)

    def hide(self):
        blur = self.blur
        self.blur = None
        if blur is not None:
            blur.fini()
