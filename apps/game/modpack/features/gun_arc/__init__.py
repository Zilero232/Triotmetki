from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'gun_arc'
PACKAGE_ID = 'net.triotmetki.gun_arc'
PACKAGE_NAME = 'Three Marks: gun traverse limits'
VERSION = '0.4.1'


def create(app):
    from .client import GunArcPanel
    return GunArcPanel(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
