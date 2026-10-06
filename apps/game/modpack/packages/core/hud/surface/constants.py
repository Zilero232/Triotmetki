from __future__ import absolute_import, division, print_function, unicode_literals

# The Gameface HUD page (ui-web `hud` entry, packages/ui/gameface/hud.html) and its view model: one string
# property with the whole HUD as JSON, one command the page sends its messages through.
HUD_PROTOCOL_VERSION = 5
HUD_STATE_PROPERTY = 'state'
HUD_SEND_COMMAND = 'send'
HUD_MESSAGE_ARG = 'message'
HUD_COMMANDS = ('ready', 'moved', 'resized', 'pressed', 'mouse', 'drawn', 'area')
# The most panel ids one `drawn` message names.
HUD_MAX_DRAWN = 64
# What the page reports once per page the first time it sees it in edit mode: a panel under the pointer, a press,
# a wheel turn.
MOUSE_EVENTS = ('hover', 'down', 'wheel')
HUD_MAX_MESSAGE_CHARS = 4 * 1024
HUD_RES_MAP_ID = 'otmetki/ui/hud'
# The state is pushed up to once a frame, so it is encoded without sorted keys: Python 2.7's json uses its C encoder
# only then. ASCII escapes stay: 2.7 has no C encoder for ensure_ascii=False (measured 3.6 times slower).
HUD_JSON = {'separators': (',', ':'), 'ensure_ascii': True}

SPACE_BATTLE = 'battle'
SPACE_LOBBY = 'lobby'

ALIGN_X = ('left', 'center', 'right')
ALIGN_Y = ('top', 'center', 'bottom')
POSITION_LIMIT = 4000
SCALE_LIMITS = (0.5, 3.0)

# The hangar's settings button stays clickable without the edit modifier; a label lets the mouse through.
KIND_LABEL = 'label'
KIND_BUTTON = 'button'
KINDS = (KIND_LABEL, KIND_BUTTON)

# GUIFlash label props -> the page's panel keys, with the value a panel has when a prop was never sent.
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
    ('kind', 'kind', KIND_LABEL),
    ('widget', 'widget', None),
    ('dock', 'dock', None),
    ('attach', 'attach', None),
    ('hint', 'hint', ''),
    ('cover', 'cover', ''),
)
# A panel's `cover` (core.hud.layer: the stock view over it, the page fades the panel and takes no mouse over it):
# none, the full stats (Tab), a modal view (the Esc menu).
COVERS = ('', 'stats', 'modal')
# The optional int keys of a panel's `dock` (core.hud.panel.dock_of).
DOCK_NUMBERS = ('reserve', 'ceiling')
# The int keys of a panel's `attach` (core.hud.panel.attach_of): the measured stock sizes in design px.
ATTACH_NUMBERS = ('bar', 'minimap')

# A label in the page-ready log line: its alias without the common prefix and its widget kind (or `text`).
SUMMARY_PREFIXES = ('otmetki.hud.', 'otmetki.')
SUMMARY_ENTRY = '%s[%s]'
SUMMARY_TEXT = 'text'
SUMMARY_HIDDEN = ' hidden'
