from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'platoon_points'
PACKAGE_ID = 'net.triotmetki.platoon_points'
PACKAGE_NAME = 'Three Marks: platoon points'
VERSION = '0.2.5'


def create(app):
    from .client import PlatoonPointsPanel
    return PlatoonPointsPanel(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
