from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'session_stats'
PACKAGE_ID = 'net.triotmetki.session_stats'
PACKAGE_NAME = 'Three Marks: session stats'
VERSION = '0.7.1'


def create(app):
    from .client import SessionStats
    return SessionStats(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
