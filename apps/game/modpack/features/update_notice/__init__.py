from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'update_notice'
PACKAGE_ID = 'net.triotmetki.update_notice'
PACKAGE_NAME = 'Three Marks: update notice'
VERSION = '0.2.3'


def create(app):
    from .client import UpdateNotice
    return UpdateNotice(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
