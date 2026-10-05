from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'bush_circle'
PACKAGE_ID = 'net.triotmetki.bush_circle'
PACKAGE_NAME = 'Three Marks: bush circle'
VERSION = '0.1.1'


def create(app):
    from .client import BushCircle
    return BushCircle(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
