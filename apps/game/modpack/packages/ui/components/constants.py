from __future__ import absolute_import, division, print_function, unicode_literals

COMPANION_ID = 'companion'

GROUP_DATA = 'data'
GROUP_HANGAR = 'hangar'
GROUP_BATTLE = 'battle'

COMPANION_SWITCH = 'enabled'
COMPANION_KEYS = (
    'send_battle_results',
    'send_moe_snapshots',
    'send_queue_times',
    'send_loadouts',
    'send_shots',
    'share_settings',
    'settings_target',
    'settings_anonymous_stats',
    'settings_include_resolution',
    'settings_include_sensitivity',
    'hud_modifier',
    'hud_hide_under_windows',
)
COMPANION_ADVANCED = (
    'send_moe_snapshots',
    'send_queue_times',
    'send_loadouts',
    'send_shots',
    'settings_target',
    'settings_anonymous_stats',
    'settings_include_resolution',
    'settings_include_sensitivity',
    'hud_modifier',
    'hud_hide_under_windows',
)
HIDDEN_CONFIG_KEYS = ('server_url', 'bind_code', 'settings_action', 'language', 'user_set', 'defaults_revision')

ACTION_SETTINGS_EXPORT = 'settings_export'
COMPANION_ACTIONS = (ACTION_SETTINGS_EXPORT,)

PANEL_POSITION_KEYS = ('x', 'y', 'align_x', 'align_y', 'drag', 'scale')
PANEL_ADVANCED_KEYS = ('alpha',)

OPTIONAL_HOOKS = (('editor', 'ui_editor'), ('thumb', 'ui_thumb'), ('gallery', 'ui_gallery'))

SECTION_BATTLE = 'battle'
SECTION_HANGAR = 'hangar'
SECTION_REPLAYS = 'replays'
SECTION_DATA = 'data'
SECTION_HUD = 'hud'
SECTIONS = (SECTION_BATTLE, SECTION_HANGAR, SECTION_REPLAYS, SECTION_DATA, SECTION_HUD)

CONTEXT_HANGAR = 'hangar'
CONTEXT_BATTLE = 'battle'
CONTEXT_ANY = 'any'

PLACEMENT = {
    'companion': (SECTION_DATA, CONTEXT_ANY),
    'marks_panel': (SECTION_BATTLE, CONTEXT_BATTLE),
    'battle_progress': (SECTION_BATTLE, CONTEXT_BATTLE),
    'damage_log': (SECTION_BATTLE, CONTEXT_BATTLE),
    'team_hp': (SECTION_BATTLE, CONTEXT_BATTLE),
    'sixth_sense': (SECTION_BATTLE, CONTEXT_BATTLE),
    'gun_arc': (SECTION_BATTLE, CONTEXT_BATTLE),
    'bush_circle': (SECTION_BATTLE, CONTEXT_BATTLE),
    'aim_info': (SECTION_BATTLE, CONTEXT_BATTLE),
    'platoon_points': (SECTION_BATTLE, CONTEXT_BATTLE),
    'responsive_reticle': (SECTION_BATTLE, CONTEXT_BATTLE),
    'battle_hotkeys': (SECTION_BATTLE, CONTEXT_BATTLE),
    'battle_loadout': (SECTION_BATTLE, CONTEXT_BATTLE),
    'minimap': (SECTION_BATTLE, CONTEXT_BATTLE),
    'crosshair': (SECTION_BATTLE, CONTEXT_BATTLE),
    'aim_circle': (SECTION_BATTLE, CONTEXT_BATTLE),
    'camera': (SECTION_BATTLE, CONTEXT_BATTLE),
    'chat_filter': (SECTION_BATTLE, CONTEXT_BATTLE),
    'auto_messages': (SECTION_BATTLE, CONTEXT_BATTLE),
    'pack_badge': (SECTION_BATTLE, CONTEXT_BATTLE),
    'streamer_mode': (SECTION_HANGAR, CONTEXT_ANY),
    'hangar_cleaner': (SECTION_HANGAR, CONTEXT_HANGAR),
    'session_stats': (SECTION_HANGAR, CONTEXT_HANGAR),
    'battle_results': (SECTION_HANGAR, CONTEXT_ANY),
    'last_battle': (SECTION_BATTLE, CONTEXT_BATTLE),
    'hangar_marks': (SECTION_HANGAR, CONTEXT_HANGAR),
    'hangar_tweaks': (SECTION_HANGAR, CONTEXT_HANGAR),
    'hangar_info': (SECTION_HANGAR, CONTEXT_HANGAR),
    'personal_missions': (SECTION_HANGAR, CONTEXT_HANGAR),
    'auto_resupply': (SECTION_HANGAR, CONTEXT_HANGAR),
    'notification_filter': (SECTION_HANGAR, CONTEXT_HANGAR),
    'replay_manager': (SECTION_REPLAYS, CONTEXT_HANGAR),
    'replay_upload': (SECTION_REPLAYS, CONTEXT_HANGAR),
    'hud_layouts': (SECTION_HUD, CONTEXT_BATTLE),
    'comp7_helper': (SECTION_HANGAR, CONTEXT_HANGAR),
    'event_trackers': (SECTION_HANGAR, CONTEXT_HANGAR),
    'depot_seller': (SECTION_HANGAR, CONTEXT_HANGAR),
    'auto_reserves': (SECTION_HANGAR, CONTEXT_HANGAR),
    'crew_xp': (SECTION_HANGAR, CONTEXT_HANGAR),
    'hangar_space': (SECTION_HANGAR, CONTEXT_HANGAR),
    'hit_viewer': (SECTION_HANGAR, CONTEXT_HANGAR),
    'update_notice': (SECTION_HANGAR, CONTEXT_HANGAR),
    'preset_advisor': (SECTION_HANGAR, CONTEXT_HANGAR),
    'free_camera': (SECTION_REPLAYS, CONTEXT_ANY),
    'quick_demount': (SECTION_HANGAR, CONTEXT_HANGAR),
    'armor_view': (SECTION_HANGAR, CONTEXT_HANGAR),
}

PANEL_OWNERS = {
    'last_battle': 'battle_results',
}
