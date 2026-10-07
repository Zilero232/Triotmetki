from __future__ import absolute_import, division, print_function, unicode_literals


# RU 1.45 client source: SettingsParams.apply's order of applySettings and applyStorages.
def write_settings(core, values):
    core.applySettings(dict(values))
    confirmators = core.applyStorages(False) or []
    core.confirmChanges(confirmators)
    core.clearStorages()
