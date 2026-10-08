from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'auto_resupply'
PACKAGE_ID = 'net.triotmetki.auto_resupply'
PACKAGE_NAME = 'Three Marks: auto resupply'
VERSION = '0.1.3'


def create(app):
    from .client import AutoResupply
    return AutoResupply(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
