from __future__ import absolute_import, division, print_function, unicode_literals

import weakref

from ....core.client.game import client_attr
from ....core.client.hud.gameface.inject import can_inject, mod_inject
from ....core.hooks import override
from ....core.log import log, log_exception, safe
from .constants import (
    ADDED_PROPERTIES,
    INJECT_NAME,
    MODEL_PROPERTY,
    PAYLOAD_PROPERTY,
    SCRIPT_URL,
    SETUP_MODEL_CLASS,
    SETUP_MODEL_MODULE,
    STOCK_COMMANDS,
    STOCK_PROPERTIES,
)


def _client_parts():
    view_model = client_attr('frameworks.wulf', 'ViewModel')
    setup_model = client_attr(SETUP_MODEL_MODULE, SETUP_MODEL_CLASS)
    if view_model is None or setup_model is None or not can_inject():
        log('preset advisor: no OpenWG Gameface or no ammunition setup model, the setup stays unmarked')
        return None
    return view_model, setup_model


def _payload_model_class(view_model):

    class PayloadModel(view_model):

        def __init__(self, text):
            self.initial = text
            super(PayloadModel, self).__init__(properties=1, commands=0)

        def _initialize(self):
            super(PayloadModel, self)._initialize()
            self._addStringProperty(PAYLOAD_PROPERTY, self.initial)

        def set_payload(self, text):
            self._setString(0, text)

    return PayloadModel


class SetupInjector(object):
    def __init__(self, payload):
        self.payload = payload
        self.models = weakref.WeakSet()
        self.payload_model = None

    def install(self):
        parts = _client_parts()
        if parts is None:
            return False
        view_model, setup_model = parts
        self.payload_model = _payload_model_class(view_model)
        override(setup_model, '__init__')(self._init)
        override(setup_model, '_initialize')(self._initialize)
        return True

    @staticmethod
    def _init(original, model, properties=STOCK_PROPERTIES, commands=STOCK_COMMANDS):
        return original(model, properties=properties + ADDED_PROPERTIES, commands=commands)

    def _initialize(self, original, model, *args, **kwargs):
        result = original(model, *args, **kwargs)
        mod_inject(model, INJECT_NAME, scripts=(SCRIPT_URL,))
        payload = self.payload_model(self.payload())
        model._addViewModelProperty(MODEL_PROPERTY, payload)
        self.models.add(payload)
        return result

    @safe
    def push(self, text):
        for model in list(self.models):
            try:
                model.set_payload(text)
            except Exception:
                log_exception('preset advisor: payload')
                self.models.discard(model)
