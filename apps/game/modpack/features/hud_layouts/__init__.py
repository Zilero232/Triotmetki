from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'hud_layouts'
PACKAGE_ID = 'net.triotmetki.hud_layouts'
PACKAGE_NAME = 'Three Marks: HUD layout per battle type'
VERSION = '0.1.1'


def create(app):
    from .client import HudLayouts
    return HudLayouts(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
