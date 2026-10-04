"""The process-wide HUD layer the features share, and the choice of its renderer.

`BACKENDS` in preference order: OpenWG Gameface (the ui package's HUD page), then GUIFlash. Every
installed one joins a `BackendChain`, which draws each label with the first backend available at that
moment (GUIFlash before 0.6 draws in battle only); with none, panels stay hidden and features fall back
to system messages. The layer and the hangar labels (`core.client.ui`) share one chain, so there is one
Gameface window.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ...durable import open_config
from ...hud import BackendChain, ComponentConfig, HudLayer
from ...hud.report import PanelReport
from ...log import log, safe
from .constants import CONFIG_NAME, REPORT_DELAY_S
from .gameface import GamefaceBackend
from .guiflash import GuiFlashBackend
from .stock import StockControl

BACKENDS = (GamefaceBackend, GuiFlashBackend)

_state = {'layer': None, 'config': None, 'backend': None, 'stock': None, 'report': None}


def build_backend(backends=BACKENDS, log_missing=True):
    installed = []
    for backend in backends:
        if backend.usable():
            installed.append(backend())
        elif log_missing:
            log('HUD: %s' % backend.missing_reason())
    chain = BackendChain(installed)
    if log_missing:
        log('HUD renderers: %s' % (', '.join(chain.names) or 'none, battle and hangar panels are off'))
    return chain


def create_backend(backends=BACKENDS):
    if _state['backend'] is None:
        _state['backend'] = build_backend(backends)
    return _state['backend']


def component_config(app):
    """components.json next to config.json, shared by every component (created on first use)."""
    if _state['config'] is None:
        _state['config'] = ComponentConfig(open_config(app.config_dir, CONFIG_NAME, pretty=True))
    return _state['config']


def hud_layer(app):
    """The process-wide HUD layer (created on first use, so features need no load order)."""
    if _state['layer'] is None:
        _state['layer'] = HudLayer(create_backend(), component_config(app), getattr(app, 'translate', None))
    return _state['layer']


def stock_control(app):
    if _state['stock'] is None:
        _state['stock'] = StockControl(hud_layer(app), app.bus)
        _state['stock'].install()
    return _state['stock']


def panel_report(app):
    """The battle panels' report (`core.hud.report`), logged once per battle REPORT_DELAY_S after the avatar is
    ready."""
    layer = hud_layer(app)
    report = _state['report']
    if report is None or report.layer is not layer:
        report = PanelReport(layer)
        _state['report'] = report
        app.bus.on('battle_ready', lambda *args: BigWorld.callback(REPORT_DELAY_S, lambda: _log_report(report, app)))
    return report


@safe
def _log_report(report, app):
    if report.layer.mode is not None:
        log(report.text(report.layer.mode, stock_control(app).summary()))
