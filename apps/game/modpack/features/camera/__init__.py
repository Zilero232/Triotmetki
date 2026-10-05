from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'camera'
PACKAGE_ID = 'net.triotmetki.camera'
PACKAGE_NAME = 'Three Marks: camera'
VERSION = '0.3.2'


def create(app):
    from .client import create_camera
    return create_camera(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
