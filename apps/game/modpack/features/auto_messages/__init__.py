from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'auto_messages'
PACKAGE_ID = 'net.triotmetki.auto_messages'
PACKAGE_NAME = 'Three Marks: auto messages'
VERSION = '0.1.2'


def create(app):
    from .client import AutoMessagesFeature
    return AutoMessagesFeature(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
