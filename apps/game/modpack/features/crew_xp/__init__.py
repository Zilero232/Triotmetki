from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'crew_xp'
PACKAGE_ID = 'net.triotmetki.crew_xp'
PACKAGE_NAME = 'Three Marks: crew XP'
VERSION = '0.2.0'


def create(app):
    from .client import CrewXp
    return CrewXp(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
