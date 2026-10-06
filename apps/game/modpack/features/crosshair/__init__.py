from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'crosshair'
PACKAGE_ID = 'net.triotmetki.crosshair'
PACKAGE_NAME = 'Three Marks: crosshair presets'
VERSION = '0.6.4'


def create(app):
    from .client import create_crosshair
    return create_crosshair(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
