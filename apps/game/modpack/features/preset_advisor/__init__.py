from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'preset_advisor'
PACKAGE_ID = 'net.triotmetki.preset_advisor'
PACKAGE_NAME = 'Three Marks: preset advisor'
VERSION = '0.1.2'


def create(app):
    from .client import PresetAdvisor
    return PresetAdvisor(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)
