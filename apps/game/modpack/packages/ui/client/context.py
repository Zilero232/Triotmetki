from __future__ import absolute_import, division, print_function, unicode_literals

from ...companion.config import FEATURES
from ...companion.i18n import resolve_language
from ...core.client.game import client_language
from ...core.registry import registry
from .. import UI_ID
from ..bridge import EVENT_LANGUAGE
from ..components import load_features, root_package
from .browser import open_url


def _hud():
    try:
        from ...core.client.hud import component_config, hud_layer
    except ImportError:
        return None, None
    return component_config, hud_layer


class UiContext(object):

    switch_keys = FEATURES

    def __init__(self, app, host):
        self.app = app
        self.host = host
        self.root = root_package(__name__)

    @property
    def config(self):
        return self.app.config

    @property
    def bus(self):
        return self.app.bus

    @property
    def catalog(self):
        return self.app.translate.catalog

    @property
    def profiles(self):
        return self.host.profiles

    @property
    def component_config(self):
        factory = _hud()[0]
        return factory(self.app) if factory is not None else None

    @property
    def layer(self):
        factory = _hud()[1]
        return factory(self.app) if factory is not None else None

    def save_config(self):
        self.app.save_config()

    def language(self):
        return self.app.translate.language

    def features(self):
        return load_features(self.root, registry().instances, skip=(UI_ID,))

    def status(self):
        app = self.app
        return {
            'bound': bool(app.is_bound()),
            'auth_failed': bool(app.auth_failed),
            'account_id': app.account_id,
            'text': app.status_text(),
        }

    def set_language(self, language):
        app = self.app
        if app.config.update({'language': language}):
            app.save_config()
        app.translate.language = resolve_language(app.config.get('language'), client_language())
        app.bus.emit(EVENT_LANGUAGE, app.translate.language)
        app.settings_ui.refresh()

    def config_changed(self, keys):
        self.app.settings_ui.refresh()

    def companion_action(self, action):
        if action == 'settings_export':
            self.app.settings_share.export()

    def bind(self, code):
        self.app.bind(code)

    def open_url(self, url):
        open_url(url)

    def close(self):
        self.host.close()

    def escape_answered(self):
        self.host.window.answer_escape()

    def hud_editing(self, active):
        self.host.on_hud_editing(active)

    def reset_layout(self):
        self.host.button.reset()
