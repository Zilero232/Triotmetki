from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'event_trackers'
PACKAGE_ID = 'net.triotmetki.event_trackers'
PACKAGE_NAME = 'Three Marks: event trackers'
VERSION = '0.1.2'


def create(app):
    from .client import EventTrackers
    return EventTrackers(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
