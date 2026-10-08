from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'replay_manager'
PACKAGE_ID = 'net.triotmetki.replay_manager'
PACKAGE_NAME = 'Three Marks: replay manager'
VERSION = '0.3.7'


def create(app):
    from .client import ReplayManager
    return ReplayManager(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)


def boot():
    from .client.playback import boot as play_requested
    return play_requested()
