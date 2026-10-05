from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'hangar_cleaner'
PACKAGE_ID = 'net.triotmetki.hangar_cleaner'
PACKAGE_NAME = 'Three Marks: hangar cleaner'
VERSION = '0.1.2'


def create(app):
    from .client import HangarCleaner
    return HangarCleaner(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
