from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'pack_badge'
PACKAGE_ID = 'net.triotmetki.pack_badge'
PACKAGE_NAME = 'Three Marks: modpack user badge'
VERSION = '0.1.1'


def create(app):
    from .client import PackBadge
    return PackBadge(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
