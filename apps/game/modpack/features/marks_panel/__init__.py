from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'marks_panel'
PACKAGE_ID = 'net.triotmetki.marks_panel'
PACKAGE_NAME = 'Three Marks: marks of excellence'
VERSION = '0.8.0'


def create(app):
    from .client import MarksPanel
    return MarksPanel(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
