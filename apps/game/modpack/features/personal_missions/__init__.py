from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'personal_missions'
PACKAGE_ID = 'net.triotmetki.personal_missions'
PACKAGE_NAME = 'Three Marks: personal missions'
VERSION = '0.3.2'


def create(app):
    from .client import PersonalMissionsPanel
    return PersonalMissionsPanel(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
