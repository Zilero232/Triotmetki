from __future__ import absolute_import, division, print_function, unicode_literals

from ..components import ACTION_SETTINGS_EXPORT


class CompanionActions(object):

    def __init__(self, config, labels):
        self.config = config
        self.labels = labels

    def ui_actions(self):
        if not self.config.is_enabled('share_settings'):
            return []
        export = {
            'id': ACTION_SETTINGS_EXPORT,
            'label': self.labels().text('action_settings_export'),
            'confirm': None,
        }
        return [export]
