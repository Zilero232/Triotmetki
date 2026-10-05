from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'comp7_helper'
PACKAGE_ID = 'net.triotmetki.comp7_helper'
PACKAGE_NAME = 'Three Marks: Onslaught divisions'
VERSION = '0.4.0'


def create(app):
    from .client import Comp7Helper
    return Comp7Helper(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
