"""The process-wide HUD layer the features share, and its renderer.

The renderer is OpenWG Gameface (the ui package's HUD page); without it, or while its page cannot open, panels stay
hidden, every stock element stays and features fall back to system messages. The layer and the hangar labels
(`core.client.ui`) share one backend, so there is one Gameface page on the screen: inside the hangar view in the lobby,
in a window in battle. The layer comes with its `cover.CoverWatch`: the stock overlays over the battle cover its panels.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ...durable import open_config
from ...hud import ComponentConfig, HudLayer, NullBackend
from ...hud.cover import HIDE_UNDER_WINDOWS_KEY
from ...hud.report import PanelReport
from ...log import log, safe
from ..storage import deferred
from .constants import CONFIG_NAME, REPORT_DELAY_S
from .cover import CoverWatch
from .gameface import GamefaceBackend
from .stock import StockControl

_state = {'layer': None, 'config': None, 'backend': None, 'stock': None, 'report': None, 'cover': None}


def build_backend():
    if GamefaceBackend.usable():
        log('HUD renderer: gameface')
        return GamefaceBackend()
    log('HUD: %s, battle and hangar panels are off' % GamefaceBackend.missing_reason())
    return NullBackend()


def create_backend():
    if _state['backend'] is None:
        _state['backend'] = build_backend()
    return _state['backend']


def component_config(app):
    """components.json next to config.json, shared by every component (created on first use)."""
    if _state['config'] is None:
        _state['config'] = ComponentConfig(deferred(open_config(app.config_dir, CONFIG_NAME, pretty=True)))
    return _state['config']


def hud_layer(app):
    """The process-wide HUD layer (created on first use, so features need no load order)."""
    if _state['layer'] is None:
        _state['layer'] = HudLayer(create_backend(), component_config(app))
        battle_cover(app)
    return _state['layer']


def battle_cover(app):
    """The process-wide watch of what covers the battle view (`cover.CoverWatch`), created with the layer."""
    if _state['cover'] is None:
        _state['cover'] = CoverWatch(hud_layer(app), lambda: _config_value(app, HIDE_UNDER_WINDOWS_KEY))
        _state['cover'].install()
    return _state['cover']


def _config_value(app, key):
    config = getattr(app, 'config', None)
    return config.get(key) if config is not None else None


def stock_control(app):
    if _state['stock'] is None:
        _state['stock'] = StockControl(hud_layer(app))
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
