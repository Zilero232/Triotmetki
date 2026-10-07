# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import service
from .constants import STATS_UNAVAILABLE

# RU 1.45 client source: connection manager, predefined hosts and the lobby header's online counter.


def connection():
    try:
        from skeletons.connection_mgr import IConnectionManager
    except ImportError:
        return None
    return service(IConnectionManager)


def server_name():
    manager = connection()
    return getattr(manager, 'serverUserNameShort', None) or getattr(manager, 'serverUserName', None)


def request_ping():
    try:
        from predefined_hosts import g_preDefinedHosts
        g_preDefinedHosts.requestPing()
    except Exception:
        pass


def ping():
    manager = connection()
    url = getattr(manager, 'url', None)
    if not url:
        return None
    try:
        from predefined_hosts import g_preDefinedHosts
        return getattr(g_preDefinedHosts.getHostPingData(url), 'value', None)
    except Exception:
        return None


def online():
    try:
        from skeletons.gui.game_control import IServerStatsController
    except ImportError:
        return None, None
    stats = service(IServerStatsController)
    try:
        cluster, region, kind = stats.getStats()
    except Exception:
        return None, None
    if kind == STATS_UNAVAILABLE:
        return None, None
    return cluster, (region if region != cluster else None)
