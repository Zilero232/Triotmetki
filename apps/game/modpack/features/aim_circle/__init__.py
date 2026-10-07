from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'aim_circle'
PACKAGE_ID = 'net.triotmetki.aim_circle'
PACKAGE_NAME = 'Three Marks: smaller aim circle'
VERSION = '0.1.0'


def create(app):
    from .client import AimCircle
    return AimCircle(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
