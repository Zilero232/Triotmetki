from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'hit_viewer'
PACKAGE_ID = 'net.triotmetki.hit_viewer'
PACKAGE_NAME = 'Three Marks: hit viewer'
VERSION = '0.2.0'


def create(app):
    from .client import HitViewer
    return HitViewer(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
