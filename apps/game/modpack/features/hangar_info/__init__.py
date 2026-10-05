from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'hangar_info'
PACKAGE_ID = 'net.triotmetki.hangar_info'
PACKAGE_NAME = 'Three Marks: hangar info'
VERSION = '0.6.0'


def create(app):
    from .client import HangarInfo
    return HangarInfo(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
