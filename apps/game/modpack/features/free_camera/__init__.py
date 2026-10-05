from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'free_camera'
PACKAGE_ID = 'net.triotmetki.free_camera'
PACKAGE_NAME = 'Three Marks: free camera'
VERSION = '0.1.1'


def create(app):
    from .client import FreeCamera
    return FreeCamera(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
