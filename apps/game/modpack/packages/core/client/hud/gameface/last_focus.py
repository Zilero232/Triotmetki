from __future__ import absolute_import, division, print_function, unicode_literals

import weakref

from ....hooks import override

_installed = []


class LastFocus(object):
    """The client window that last took the keyboard focus, other than the HUD's own (`is_own(window)`).

    RU 1.45 client source: frameworks/wulf/windows_system/window.py `_cFocusChanged` is how the engine tells every wulf
    window, Scaleform's `SFWindow` pages included, that it got or lost the focus. The battle chat and the lobby channels
    type into the Scaleform page's window, so a focus the HUD window took goes back to exactly that window, never to the
    main window under it."""

    def __init__(self, is_own):
        self.is_own = is_own
        self.ref = None

    def install(self):
        if self in _installed:
            return True
        try:
            from frameworks.wulf import Window
        except ImportError:
            return False
        override(Window, '_cFocusChanged')(self._on_focus_changed)
        _installed.append(self)
        return True

    def _on_focus_changed(self, original, window, focused, *args, **kwargs):
        result = original(window, focused, *args, **kwargs)
        if focused and not self.is_own(window):
            self.remember(window)
        return result

    def remember(self, window):
        try:
            self.ref = weakref.ref(window)
        except TypeError:
            self.ref = None

    def window(self):
        return self.ref() if self.ref is not None else None
