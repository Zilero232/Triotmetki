from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'notification_filter'
PACKAGE_ID = 'net.triotmetki.notification_filter'
PACKAGE_NAME = 'Three Marks: notification filter'
VERSION = '0.1.2'


def create(app):
    from .client import NotificationFilter
    return NotificationFilter(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
