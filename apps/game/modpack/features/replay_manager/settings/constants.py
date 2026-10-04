from __future__ import absolute_import, division, print_function, unicode_literals

MAX_TEMPLATE = 100
DEFAULT_NAME_TEMPLATE = '{date}_{time}_{map}_{vehicle}_{result}'

SWITCH = 'hangar_replay_manager'
GROUP = 'hangar'

DEFAULTS = {
    'notify_analysis': True,
    'auto_rename': False,
    'name_template': DEFAULT_NAME_TEMPLATE,
}

ADVANCED = ('name_template',)
