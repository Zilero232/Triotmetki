from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'aim_info'
PACKAGE_ID = 'net.triotmetki.aim_info'
PACKAGE_NAME = 'Three Marks: aim and shells'
VERSION = '0.1.3'


def create(app):
    from .client import AimInfo
    return AimInfo(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
