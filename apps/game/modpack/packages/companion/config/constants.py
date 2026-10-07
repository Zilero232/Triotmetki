from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.hud.modes.constants import PLACES_SECTION as LAYOUT_PLACES_SECTION  # noqa: F401
from ...core.hud.modifier import DEFAULT_MODIFIER, MODIFIER_CHOICES
from ...core.hud.panel.constants import LAYOUT_KEYS as PLACE_KEYS  # noqa: F401
from ...core.hud.panel.constants import PLACE_KEYS as PLACE_ORDER  # noqa: F401

DEFAULT_SERVER_URL = 'https://api.triotmetki.ru'
FEATURES = (
    'send_battle_results',
    'send_moe_snapshots',
    'send_queue_times',
    'send_loadouts',
    'send_shots',
    'battle_moe_panel',
    'hangar_tank_card',
    'hangar_session_panel',
    'battle_damage_log',
    'battle_team_hp',
    'battle_sixth_sense',
    'hangar_battle_results',
    'battle_last_results',
    'hangar_replay_manager',
    'hangar_tweaks',
    'minimap_tweaks',
    'camera_tweaks',
    'crosshair_presets',
    'battle_aim_circle',
    'hangar_info',
    'battle_chat_filter',
    'battle_auto_messages',
    'hangar_auto_resupply',
    'hangar_notification_filter',
    'hangar_cleaner',
    'battle_progress',
    'battle_loadout',
    'hangar_personal_missions',
    'streamer_mode',
    'battle_gun_arc',
    'battle_bush_circle',
    'battle_platoon_points',
    'battle_responsive_reticle',
    'battle_hotkeys',
    'battle_hud_layouts',
    'battle_aim_info',
    'battle_pack_badge',
    'hangar_comp7_helper',
    'hangar_event_trackers',
    'hangar_depot_seller',
    'hangar_auto_reserves',
    'hangar_crew_xp',
    'hangar_space',
    'hangar_hit_viewer',
    'hangar_update_notice',
    'hangar_quick_demount',
    'hangar_preset_advisor',
    'free_camera',
    'share_settings',
    'upload_replays',
    'publish_replays',
    'share_session_report',
)
OPT_IN_FEATURES = (
    'upload_replays',
    'publish_replays',
    'share_session_report',
    'battle_progress',
    'battle_gun_arc',
    'battle_platoon_points',
    'battle_hotkeys',
    'battle_bush_circle',
    'battle_aim_circle',
    'battle_chat_filter',
    'streamer_mode',
    'hangar_tweaks',
    'hangar_auto_resupply',
    'hangar_notification_filter',
    'hangar_cleaner',
    'hangar_event_trackers',
    'hangar_depot_seller',
    'hangar_auto_reserves',
    'hangar_space',
    'hangar_quick_demount',
    'free_camera',
    'battle_pack_badge',
)
SHARE_CHANNELS = ('telegram', 'discord', 'both')
DEFAULTS_REVISION = 10
RETIRED_DEFAULTS = (
    (1, 'battle_loadout', False, True),
    (3, 'hangar_tweaks', True, False),
    (3, 'battle_chat_filter', True, False),
    (3, 'hangar_auto_resupply', True, False),
    (3, 'hangar_notification_filter', True, False),
    (3, 'hangar_cleaner', True, False),
    (3, 'streamer_mode', True, False),
    (3, 'battle_bush_circle', True, False),
    # UNVERIFIED on Lesta 1.45: suspected of native battle crashes after its image entered the player rows.
    (10, 'battle_pack_badge', True, False),
)
ONE_TIME_SWITCHES = (
    (2, 'battle_loadout', True),
    # UNVERIFIED on Lesta 1.45: native crashes followed the badge image in the battle UI.
    (10, 'battle_pack_badge', False),
)
MIGRATION_REVISION = 3
COMPONENTS_FILE = 'components.json'
FEATURES_PACKAGE = 'features'
GUARDED_SWITCHES = (
    ('hangar_tweaks', 'hangar_tweaks'),
    ('battle_chat_filter', 'chat_filter'),
    ('hangar_auto_resupply', 'auto_resupply'),
    ('hangar_notification_filter', 'notification_filter'),
    ('hangar_cleaner', 'hangar_cleaner'),
    ('battle_bush_circle', 'bush_circle'),
    ('streamer_mode', 'streamer_mode'),
)
MERGED_SWITCHES = (
    ('battle_damage_log', ('battle_hit_log', 'battle_received_hits')),
    ('battle_moe_panel', ('hangar_marks', 'hangar_marks_history')),
    ('battle_progress', ('battle_main_gun', 'battle_efficiency')),
    ('hangar_session_panel', ('hangar_session_goals', 'hangar_ratings')),
    ('hangar_battle_results', ('hangar_battle_hits',)),
    ('hangar_info', ('battle_clock',)),
)
MERGED_SECTIONS = (
    (('hit_log', 'lines', 6), ('damage_log', 'dealt_lines')),
    (('damage_log', 'log_lines', 5), ('damage_log', 'dealt_lines')),
    (('received_hits', 'lines', 5), ('damage_log', 'received_lines')),
    (('hit_log', 'group_by_target', False), ('damage_log', 'group_by_target')),
    (('damage_log', 'log_kinds', 'all'), ('damage_log', 'sections')),
    (('session_goals', 'show_hangar', True), ('session_stats', 'show_goals')),
    (('session_goals', 'max_goals', 3), ('session_stats', 'max_goals')),
    (('hangar_ratings', 'show_account', True), ('session_stats', 'show_account')),
    (('hangar_ratings', 'metric_wn8', True), ('session_stats', 'metric_wn8')),
    (('hangar_ratings', 'metric_win_rate', True), ('session_stats', 'metric_win_rate')),
    (('hangar_ratings', 'metric_avg_damage', True), ('session_stats', 'metric_avg_damage')),
    (('hangar_ratings', 'metric_eff', False), ('session_stats', 'metric_eff')),
    (('main_gun', 'show_team', True), ('battle_progress', 'main_gun_share')),
    (('main_gun', 'x', -372), ('battle_progress', 'x')),
    (('main_gun', 'y', 60), ('battle_progress', 'y')),
    (('main_gun', 'align_x', 'right'), ('battle_progress', 'align_x')),
    (('main_gun', 'align_y', 'top'), ('battle_progress', 'align_y')),
    (('battle_hits', 'show_attacker', True), ('battle_results', 'hits_show_attacker')),
    (('hangar_marks', 'style', 'extended'), ('marks_panel', 'hangar_style')),
    (('marks_history', 'show_panel', True), ('marks_panel', 'show_trend')),
    (('marks_history', 'trend_battles', 5), ('marks_panel', 'trend_battles')),
    (('hangar_ratings', 'show_tank', True), ('marks_panel', 'show_tank_ratings')),
)
SWITCHED_PARTS = (
    ('battle_progress', (
        ('battle_main_gun', 'row_main_gun'),
        ('battle_efficiency', 'row_wn8'),
    )),
)
SWITCHED_OFF_PARTS = (
    (('hangar_session_goals',), 'session_stats', 'show_goals'),
    (('hangar_ratings',), 'session_stats', 'show_account'),
    (('hangar_battle_hits',), 'battle_results', 'hits_tab'),
    (('battle_moe_panel',), 'marks_panel', 'show_battle_panel'),
    (('hangar_marks', 'hangar_marks_history'), 'marks_panel', 'hangar_card'),
)
RETIRED_VALUES = (
    (3, 'hangar_info', 'clock_format', '%H:%M:%S', '%H:%M'),
    (3, 'hangar_info', 'date_format', '%d.%m.%Y', '%d.%m'),
    (3, 'marks_panel', 'style', 'extended', 'compact'),
    (4, 'crosshair', 'mark', 'chevron_thin', 'none'),
    (4, 'crew_xp', 'show_card', True, False),
    (5, 'crosshair', 'show_zoom', False, True),
    (8, 'team_hp', 'style', 'full', 'icons'),
    (8, 'minimap', 'vehicle_names', 'native', 'always'),
)
MOVED_PLACES = (
    (3, 'hangar_info', (-16, 76, 'right', 'top'), (0, -196, 'left', 'bottom')),
    (4, 'hangar_info', (0, -196, 'left', 'bottom'), (50, 83, 'left', 'top')),
)
SPLIT_REVISION = 5
SPLIT_SWITCHES = (
    ('battle_moe_panel', 'battle_moe_panel', ('marks_panel', 'show_battle_panel')),
    ('hangar_tank_card', 'battle_moe_panel', ('marks_panel', 'hangar_card')),
)
SPLIT_KEYS = (
    (('marks_panel', 'hangar_style'), ('hangar_marks', 'style')),
    (('marks_panel', 'show_trend'), ('hangar_marks', 'show_trend')),
    (('marks_panel', 'trend_battles'), ('hangar_marks', 'trend_battles')),
    (('marks_panel', 'show_tank_ratings'), ('hangar_marks', 'show_tank_ratings')),
    (('marks_panel', 'show_mastery'), ('hangar_marks', 'show_mastery')),
    (('marks_panel', 'show_research'), ('hangar_marks', 'show_research')),
    (('marks_panel', 'carousel_percent'), ('hangar_marks', 'carousel_percent')),
)
AIM_CIRCLE_REVISION = 6
AIM_CIRCLE_FROM = ('aim_info', 'aim_circle', 'aim_circle_scale', 70)
AIM_CIRCLE_TO = ('crosshair', 'aim_circle')
AIM_CIRCLE_CHOICES = ((95, 'stock'), (75, 'p80'), (65, 'p70'), (0, 'p60'))
AIM_CIRCLE_PART_REVISION = 8
AIM_CIRCLE_PART_STOCK = 'stock'
AIM_CIRCLE_PART_TO = ('battle_aim_circle', 'aim_circle', 'size')
DROPPED_SECTIONS = (
    'hit_log',
    'received_hits',
    'death_card',
    'last_hit',
    'arty_meter',
    'session_goals',
    'hangar_ratings',
    'tilt_guard',
    'platoon_helper',
    'main_gun',
    'battle_efficiency',
    'personal_best',
    'battle_hits',
    'reload_timer',
    'marks_history',
    'battle_sounds',
    'battle_summary',
    'config_backup',
    'battle_clock',
    'battle_menu',
)
DROPPED_KEYS = (
    ('crosshair', 'repair_timers'),
    ('crosshair', 'aim_circle'),
    ('update_notice', 'show_card'),
    ('aim_info', 'armor_under_aim'),
    ('aim_info', 'show_nominal'),
    ('aim_info', 'show_piercing'),
    ('aim_info', 'show_angle'),
    ('aim_info', 'placement'),
    ('aim_info', 'aim_circle'),
    ('aim_info', 'aim_circle_scale'),
    ('aim_info', 'x'),
    ('aim_info', 'y'),
    ('aim_info', 'align_x'),
    ('aim_info', 'align_y'),
    ('aim_info', 'alpha'),
    ('aim_info', 'drag'),
    ('aim_info', 'scale'),
    ('marks_panel', 'show_battle_panel'),
    ('marks_panel', 'hangar_card'),
    ('marks_panel', 'hangar_style'),
    ('marks_panel', 'show_trend'),
    ('marks_panel', 'trend_battles'),
    ('marks_panel', 'show_tank_ratings'),
    ('marks_panel', 'show_mastery'),
    ('marks_panel', 'show_research'),
    ('marks_panel', 'carousel_percent'),
    ('marks_panel', 'show_battles'),
    ('marks_panel', 'alt_detail'),
    ('hangar_info', 'battle_clock'),
    ('hangar_info', 'replace_timer'),
    ('damage_log', 'alt_mode'),
    ('damage_log', 'alt_entry_template'),
    ('pack_badge', 'stock_badge'),
    ('hangar_marks', 'alt_detail'),
)
DROPPED_PANELS = ('aim_info',)
USER_SET_KEY = 'user_set'
MAX_USER_SET = 8000
DEFAULTS = {
    'enabled': True,
    'server_url': DEFAULT_SERVER_URL,
    'language': 'auto',
    'session_idle_minutes': 60,
    'bind_code': '',
    'send_battle_results': True,
    'send_moe_snapshots': True,
    'send_queue_times': True,
    'send_loadouts': True,
    'send_shots': True,
    'battle_moe_panel': True,
    'hangar_tank_card': True,
    'hangar_session_panel': True,
    'battle_damage_log': True,
    'battle_team_hp': True,
    'battle_sixth_sense': True,
    'hangar_battle_results': True,
    'battle_last_results': True,
    'hangar_replay_manager': True,
    'hangar_tweaks': False,
    'minimap_tweaks': True,
    'camera_tweaks': True,
    'crosshair_presets': True,
    'battle_aim_circle': False,
    'hangar_info': True,
    'battle_chat_filter': False,
    'battle_auto_messages': True,
    'hangar_auto_resupply': False,
    'hangar_notification_filter': False,
    'hangar_cleaner': False,
    'battle_progress': False,
    'battle_loadout': True,
    'hangar_personal_missions': True,
    'streamer_mode': False,
    'battle_gun_arc': False,
    'battle_bush_circle': False,
    'battle_platoon_points': False,
    'battle_responsive_reticle': True,
    'battle_hotkeys': False,
    'battle_hud_layouts': True,
    'battle_aim_info': True,
    'battle_pack_badge': False,
    'hangar_comp7_helper': True,
    'hangar_event_trackers': False,
    'hangar_depot_seller': False,
    'hangar_auto_reserves': False,
    'hangar_crew_xp': True,
    'hangar_space': False,
    'hangar_hit_viewer': True,
    'hangar_update_notice': True,
    'hangar_quick_demount': False,
    'hangar_preset_advisor': True,
    'free_camera': False,
    'share_settings': True,
    'upload_replays': False,
    'publish_replays': False,
    'share_session_report': False,
    'share_session_channel': 'telegram',
    'show_pack_badge': True,
    'settings_action': '',
    'settings_target': 'private',
    'settings_anonymous_stats': False,
    'settings_include_resolution': False,
    'settings_include_sensitivity': False,
    'hud_modifier': DEFAULT_MODIFIER,
    'hud_hide_under_windows': True,
    'defaults_revision': DEFAULTS_REVISION,
    USER_SET_KEY: '',
}
CHOICES = {
    'settings_action': ('', 'export'),
    'settings_target': ('profile', 'private'),
    'share_session_channel': SHARE_CHANNELS,
    'hud_modifier': MODIFIER_CHOICES,
}
LIMITS = {
    'session_idle_minutes': (10, 24 * 60),
}
LOCAL_HOSTS = ('localhost', '127.0.0.1')
SECURE_SCHEME = 'https'
PLAIN_SCHEME = 'http'
DEV_ENV = 'OTMETKI_DEV'
DEV_ENV_ON = '1'
DEV_FOLDER = 'otmetki-dev'
DEV_MANIFEST = 'otmetki-dev.json'
MODS_DIR = 'mods'
FIXED = {'flush_interval_seconds': 15}
