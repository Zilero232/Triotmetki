from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'team_hp'
PACKAGE_ID = 'net.triotmetki.team_hp'
PACKAGE_NAME = 'Three Marks: team HP'
VERSION = '0.6.3'


def create(app):
    from .client import TeamHpPanel
    return TeamHpPanel(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
