from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'quick_demount'
PACKAGE_ID = 'net.triotmetki.quick_demount'
PACKAGE_NAME = 'Three Marks: quick demount'
VERSION = '0.1.2'


def create(app):
    from .client import QuickDemount
    return QuickDemount(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
