from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'depot_seller'
PACKAGE_ID = 'net.triotmetki.depot_seller'
PACKAGE_NAME = 'Three Marks: depot seller'
VERSION = '0.1.2'


def create(app):
    from .client import DepotSeller
    return DepotSeller(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
