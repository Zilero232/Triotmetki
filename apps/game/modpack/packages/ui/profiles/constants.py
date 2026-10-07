from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.hud.modes import PLACES_SECTION
from ..window_layout import SECTION as WINDOW_SECTION

FILE_NAME = 'profiles.json'
FILE_VERSION = 1
MAX_PROFILES = 12
NAME_MAX_LENGTH = 40

# user_set and defaults_revision describe this install's history of choices and default upgrades: a profile loaded
# later must not roll them back. `enabled` is the whole mod's switch (data sending included): only the player turns it.
EXCLUDED_CONFIG_KEYS = (
    'enabled',
    'user_set',
    'defaults_revision',
    'server_url',
    'bind_code',
    'settings_action',
    'settings_target',
    'settings_anonymous_stats',
    'share_settings',
    'upload_replays',
    'publish_replays',
    'share_session_report',
    'show_pack_badge',
)
EXCLUDED_CONFIG_PREFIXES = ('send_', 'settings_include_')
# Where the settings window sits depends on the player's screen, so it never travels in a profile or its code.
EXCLUDED_SECTIONS = (WINDOW_SECTION,)

# A code may come from a stranger, so it never switches on what sends client requests or hides client views (CLAUDE.md
# "Hangar actions only on the player's request"); the player's own saved profiles keep them. The names are the
# features' switches and sections, spelled here because the ui package must not import a feature that may be missing.
CODE_EXCLUDED_CONFIG_KEYS = (
    'hangar_auto_reserves',
    'hangar_auto_resupply',
    'hangar_depot_seller',
    'hangar_cleaner',
    'hangar_notification_filter',
    'battle_chat_filter',
    'battle_auto_messages',
)
CODE_EXCLUDED_SECTIONS = (
    'auto_reserves',
    'auto_resupply',
    'depot_seller',
    'hangar_cleaner',
    'notification_filter',
    'chat_filter',
    'auto_messages',
)
CODE_EXCLUDED_SECTION_KEYS = {'hangar_tweaks': ('quick_actions',)}
# Plain-data sections a code may carry besides the schema sections of the installed components: the HUD places per
# battle type, which the layer cleans on every read.
CODE_RAW_SECTIONS = (PLACES_SECTION,)

CODE_PREFIX = 'TM1.'
CODE_MAX_CHARS = 48 * 1024
# A real profile unpacks to a few kilobytes; a code that unpacks past this is refused before it is parsed.
UNPACKED_MAX_BYTES = 1024 * 1024

ERROR_LIMIT = 'limit'
ERROR_NAME = 'name'
ERROR_MISSING = 'missing'
ERROR_CODE = 'code'
