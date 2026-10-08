from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'hangar_tweaks'
PACKAGE_ID = 'net.triotmetki.hangar_tweaks'
PACKAGE_NAME = 'Three Marks: hangar tweaks'
VERSION = '0.3.4'


def create(app):
    from .client import HangarTweaks
    return HangarTweaks(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
