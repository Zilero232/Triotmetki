from __future__ import absolute_import, division, print_function, unicode_literals

HUD_PROTOCOL_VERSION = 6
HUD_STATE_PROPERTY = 'state'
HUD_SEND_COMMAND = 'send'
HUD_MESSAGE_ARG = 'message'
HUD_COMMANDS = ('ready', 'moved', 'resized', 'mouse', 'drawn', 'area')
HUD_MAX_DRAWN = 64
MOUSE_EVENTS = ('hover', 'down', 'wheel')
HUD_MAX_MESSAGE_CHARS = 4 * 1024
HUD_RES_MAP_ID = 'otmetki/ui/hud'
# Python 2.7's json uses its C encoder only without sort_keys and with ensure_ascii.
HUD_JSON = {'separators': (',', ':'), 'ensure_ascii': True}

SPACE_BATTLE = 'battle'
SPACE_LOBBY = 'lobby'

ALIGN_X = ('left', 'center', 'right')
ALIGN_Y = ('top', 'center', 'bottom')
POSITION_LIMIT = 4000
SCALE_LIMITS = (0.5, 3.0)

PANEL_KEYS = (
    ('text', 'text', ''),
    ('x', 'x', 0),
    ('y', 'y', 0),
    ('alignX', 'align_x', 'left'),
    ('alignY', 'align_y', 'top'),
    ('alpha', 'alpha', 1.0),
    ('drag', 'drag', False),
    ('border', 'border', False),
    ('visible', 'visible', True),
    ('scale', 'scale', 1.0),
    ('widget', 'widget', None),
    ('dock', 'dock', None),
    ('attach', 'attach', None),
)
DOCK_NUMBERS = ('reserve', 'ceiling')
ATTACH_NUMBERS = ('bar', 'minimap')

SUMMARY_PREFIXES = ('otmetki.hud.', 'otmetki.')
SUMMARY_ENTRY = '%s[%s]'
SUMMARY_TEXT = 'text'
SUMMARY_HIDDEN = ' hidden'
