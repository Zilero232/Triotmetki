from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'auto_reserves'
PACKAGE_ID = 'net.triotmetki.auto_reserves'
PACKAGE_NAME = 'Three Marks: auto reserves'
VERSION = '0.1.1'


def create(app):
    from .client import AutoReserves
    return AutoReserves(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
