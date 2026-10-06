"""The in-game settings window, behind a small interface so the app needs no window code.

The app starts with the null `SettingsView` (no window: config.json is edited by hand); the ui package attaches its
Gameface window with `attach_settings_view` when it starts, and the window's entry is the ModsList row. The app only
calls `register()` and `refresh()`; a view calls back `app.config`, `app.translate`, `app.status_text()`,
`app.save_config()` and `app.bind(code)`.
"""
from __future__ import absolute_import, division, print_function, unicode_literals


class SettingsView(object):

    name = 'none'

    def __init__(self, app):
        self.app = app

    @classmethod
    def available(cls):
        return True

    def register(self):
        """Put the window's entry in place; False when there is none."""
        return False

    def refresh(self):
        """The config, the binding or the language changed: redraw an open window."""


def attach_settings_view(app, view):
    """Make `view` the app's settings window and register it."""
    app.settings_ui = view
    view.register()
    return view
