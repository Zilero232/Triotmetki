from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'armor_view'
PACKAGE_ID = 'net.triotmetki.armor_view'
PACKAGE_NAME = 'Three Marks: tank armour'
VERSION = '0.1.0'


def create(app):
    from .client import ArmorView
    return ArmorView(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
