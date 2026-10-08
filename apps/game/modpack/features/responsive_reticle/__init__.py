from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'responsive_reticle'
PACKAGE_ID = 'net.triotmetki.responsive_reticle'
PACKAGE_NAME = 'Three Marks: responsive reticle'
VERSION = '0.1.3'


def create(app):
    from .client import ResponsiveReticle
    return ResponsiveReticle(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
