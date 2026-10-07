from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.hud.modes import PLACES_SECTION
from ..window_layout import SECTION as WINDOW_SECTION

FILE_NAME = 'profiles.json'
FILE_VERSION = 1
MAX_PROFILES = 12
NAME_MAX_LENGTH = 40

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
EXCLUDED_SECTIONS = (WINDOW_SECTION,)

# A code may come from a stranger: it never switches on client requests or hides client views.
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
CODE_RAW_SECTIONS = (PLACES_SECTION,)

CODE_PREFIX = 'TM1.'
CODE_MAX_CHARS = 48 * 1024
UNPACKED_MAX_BYTES = 1024 * 1024

ERROR_LIMIT = 'limit'
ERROR_NAME = 'name'
ERROR_MISSING = 'missing'
ERROR_CODE = 'code'
