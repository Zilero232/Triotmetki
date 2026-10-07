from __future__ import absolute_import, division, print_function, unicode_literals

PROTOCOL_VERSION = 2
MAX_MESSAGE_CHARS = 64 * 1024

STATE_PROPERTY = 'state'
FEED_PROPERTY = 'feed'
ESCAPE_PROPERTY = 'escape'
SEND_COMMAND = 'send'
MESSAGE_ARG = 'message'

COMMANDS = (
    'ready',
    'close',
    'set',
    'set_many',
    'action',
    'language',
    'bind',
    'open',
    'profile_save',
    'profile_load',
    'profile_rename',
    'profile_delete',
    'profile_export',
    'profile_import',
    'hud_edit',
    'hud_move',
    'hud_reset',
    'hud_reset_all',
    'window_layout',
    'feed',
    'diag',
    'escape',
    'scroll',
)

REQUIRED = {
    'set': ('component', 'key', 'value'),
    'set_many': ('component', 'values'),
    'action': ('component', 'action'),
    'language': ('language',),
    'bind': ('code',),
    'open': ('path',),
    'profile_save': ('name',),
    'profile_load': ('id',),
    'profile_rename': ('id', 'name'),
    'profile_delete': ('id',),
    'profile_export': ('id',),
    'profile_import': ('code',),
    'hud_edit': ('active',),
    'hud_move': ('panel', 'x', 'y'),
    'hud_reset': ('panel',),
    'window_layout': ('x', 'y', 'width', 'height', 'zoom'),
    'feed': ('component', 'active'),
    'diag': ('text',),
    'scroll': ('page', 'top'),
}

QUIET_COMMANDS = ('feed', 'diag', 'escape', 'scroll')

MAX_DIAG_CHARS = 400

RES_MAP_WINDOW = 'otmetki/ui/settings'
