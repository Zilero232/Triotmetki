from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'minimap'
PACKAGE_ID = 'net.triotmetki.minimap'
PACKAGE_NAME = 'Three Marks: minimap'
VERSION = '0.2.2'


def create(app):
    from .client import create_minimap
    return create_minimap(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
