from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'chat_filter'
PACKAGE_ID = 'net.triotmetki.chat_filter'
PACKAGE_NAME = 'Three Marks: chat filter'
VERSION = '0.1.2'


def create(app):
    from .client import ChatFilterFeature
    return ChatFilterFeature(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
