from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'battle_menu'
PACKAGE_ID = 'net.triotmetki.battle_menu'
PACKAGE_NAME = 'Three Marks: settings from the battle menu'
VERSION = '0.1.2'


def create(app):
    from .client import BattleMenuEntry
    return BattleMenuEntry(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
