from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'streamer_mode'
PACKAGE_ID = 'net.triotmetki.streamer_mode'
PACKAGE_NAME = 'Three Marks: streamer mode'
VERSION = '0.1.2'


def create(app):
    from .client import StreamerMode
    return StreamerMode(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
