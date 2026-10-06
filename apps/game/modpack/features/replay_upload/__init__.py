from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'replay_upload'
PACKAGE_ID = 'net.triotmetki.replay_upload'
PACKAGE_NAME = 'Three Marks: replay auto-upload'
VERSION = '0.2.2'


def create(app):
    from .client import ReplayAutoUpload
    return ReplayAutoUpload(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
