from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support  # noqa: F401

CLIENT_PREFIX = 'otmetki.core.client'
STUBBED = (
    'ResMgr',
    'helpers',
    'helpers.dependency',
    'skeletons',
    'skeletons.account_helpers',
    'skeletons.account_helpers.settings_core',
)


def load_repair():
    saved = sys.modules.get('BigWorld')
    sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
    try:
        return importlib.import_module('otmetki.core.client.native').repair_detection_sound
    finally:
        if saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = saved
        for name in [name for name in sys.modules if name.startswith(CLIENT_PREFIX)]:
            del sys.modules[name]


repair_detection_sound = load_repair()


class SettingsCore(object):

    def __init__(self, settings):
        self.settings = dict(settings)
        self.calls = []

    def getSetting(self, name):
        return self.settings.get(name)

    def applySettings(self, diff):
        self.calls.append(('applySettings', dict(diff)))
        self.settings.update(diff)

    def applyStorages(self, restartApproved, force=False):
        self.calls.append(('applyStorages', restartApproved))
        return ['confirmator']

    def confirmChanges(self, confirmators):
        self.calls.append(('confirmChanges', confirmators))

    def clearStorages(self):
        self.calls.append(('clearStorages',))


def module(name, **attributes):
    stub = types.ModuleType(str(name))
    stub.__path__ = []
    for key, value in attributes.items():
        setattr(stub, key, value)
    return stub


class DetectionSoundRepairTest(unittest.TestCase):

    def setUp(self):
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED)
        self.files = set()
        self.core = SettingsCore({'bulbVoices': 2})
        skeleton = type(str('ISettingsCore'), (object,), {})
        instances = {skeleton: self.core}
        sys.modules['ResMgr'] = module('ResMgr', isFile=lambda path: path in self.files)
        sys.modules['helpers'] = module('helpers')
        sys.modules['helpers.dependency'] = module('helpers.dependency', instance=instances.get)
        sys.modules['skeletons'] = module('skeletons')
        sys.modules['skeletons.account_helpers'] = module('skeletons.account_helpers')
        sys.modules['skeletons.account_helpers.settings_core'] = module(
            'skeletons.account_helpers.settings_core',
            ISettingsCore=skeleton,
        )

    def tearDown(self):
        for name, saved in self.saved.items():
            if saved is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = saved

    def test_a_user_sound_without_its_mp3_goes_back_to_the_stock_lamp(self):
        repaired = repair_detection_sound()

        assert repaired is True
        assert self.core.settings['bulbVoices'] == 0

    def test_the_repair_writes_the_way_the_settings_window_does(self):
        repair_detection_sound()

        assert self.core.calls == [
            ('applySettings', {'bulbVoices': 0}),
            ('applyStorages', False),
            ('confirmChanges', ['confirmator']),
            ('clearStorages',),
        ]

    def test_a_user_sound_with_its_mp3_is_kept(self):
        self.files.add('audioww/sixthSense.mp3')

        repaired = repair_detection_sound()

        assert repaired is False
        assert self.core.calls == []

    def test_a_stock_lamp_is_never_touched(self):
        self.core.settings['bulbVoices'] = 1

        repaired = repair_detection_sound()

        assert repaired is False
        assert self.core.calls == []

    def test_without_resmgr_nothing_is_changed(self):
        sys.modules['ResMgr'] = None

        repaired = repair_detection_sound()

        assert repaired is False
        assert self.core.calls == []
