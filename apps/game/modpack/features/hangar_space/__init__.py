from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'hangar_space'
PACKAGE_ID = 'net.triotmetki.hangar_space'
PACKAGE_NAME = 'Three Marks: hangar space'
VERSION = '0.2.0'


def create(app):
    from .client import HangarSpace
    return HangarSpace(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
