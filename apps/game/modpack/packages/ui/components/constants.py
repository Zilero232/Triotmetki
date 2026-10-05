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
# Rare data-sharing details, folded under the Advanced fold (docs/specs/2026-09-30-hud-consolidation-and-design.md,
# section 12).
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
# Never editable in the window: connection, one-shot actions and the language (the header switches it).
HIDDEN_CONFIG_KEYS = ('server_url', 'bind_code', 'settings_action', 'language', 'user_set', 'defaults_revision')

ACTION_SETTINGS_EXPORT = 'settings_export'
COMPANION_ACTIONS = (ACTION_SETTINGS_EXPORT,)

PANEL_POSITION_KEYS = ('x', 'y', 'align_x', 'align_y', 'drag', 'scale')
# The opacity of a panel is a rare choice.
PANEL_ADVANCED_KEYS = ('alpha',)

# Card keys sent only when the feature instance has the hook: the full-window editor, the card's thumbnail
# (img:// path or None) and the per-choice pictures ({field key: {choice value: img:// path or None}}).
OPTIONAL_HOOKS = (('editor', 'ui_editor'), ('thumb', 'ui_thumb'), ('gallery', 'ui_gallery'))

# The settings window's navigation: every component card sits on one section page. Profiles and the HUD editor are
# pages of their own (the page's SECTION constants), not component sections.
SECTION_BATTLE = 'battle'
SECTION_HANGAR = 'hangar'
SECTION_MARKS = 'marks'
SECTION_REPLAYS = 'replays'
SECTION_STREAMER = 'streamer'
SECTION_DATA = 'data'
# The HUD editor's page also lists the components that shape the whole battle HUD (the layout per battle type).
SECTION_HUD = 'hud'
SECTIONS = (SECTION_BATTLE, SECTION_HANGAR, SECTION_MARKS, SECTION_REPLAYS, SECTION_STREAMER, SECTION_DATA, SECTION_HUD)

# Where a component shows anything: only in the hangar, only in battle, or in both. catalog/catalog.json carries the
# `context` of each package for the manager: its component's, or `any` when its components (the feature's settings
# PARTS) show in the hangar and in battle (packages/ui/tests/test_placement.py keeps both in step).
CONTEXT_HANGAR = 'hangar'
CONTEXT_BATTLE = 'battle'
CONTEXT_ANY = 'any'
CONTEXTS = (CONTEXT_HANGAR, CONTEXT_BATTLE, CONTEXT_ANY)

PLACEMENT = {
    'companion': (SECTION_DATA, CONTEXT_ANY),
    'marks_panel': (SECTION_MARKS, CONTEXT_BATTLE),
    'battle_progress': (SECTION_MARKS, CONTEXT_BATTLE),
    'damage_log': (SECTION_BATTLE, CONTEXT_BATTLE),
    'team_hp': (SECTION_BATTLE, CONTEXT_BATTLE),
    'sixth_sense': (SECTION_BATTLE, CONTEXT_BATTLE),
    'battle_clock': (SECTION_BATTLE, CONTEXT_ANY),
    'gun_arc': (SECTION_BATTLE, CONTEXT_BATTLE),
    'bush_circle': (SECTION_BATTLE, CONTEXT_BATTLE),
    'aim_info': (SECTION_BATTLE, CONTEXT_BATTLE),
    'platoon_points': (SECTION_BATTLE, CONTEXT_BATTLE),
    'responsive_reticle': (SECTION_BATTLE, CONTEXT_BATTLE),
    'battle_hotkeys': (SECTION_BATTLE, CONTEXT_BATTLE),
    'battle_menu': (SECTION_BATTLE, CONTEXT_BATTLE),
    'battle_loadout': (SECTION_BATTLE, CONTEXT_BATTLE),
    'minimap': (SECTION_BATTLE, CONTEXT_BATTLE),
    'crosshair': (SECTION_BATTLE, CONTEXT_BATTLE),
    'camera': (SECTION_BATTLE, CONTEXT_BATTLE),
    'chat_filter': (SECTION_STREAMER, CONTEXT_BATTLE),
    'streamer_mode': (SECTION_STREAMER, CONTEXT_ANY),
    'hangar_cleaner': (SECTION_STREAMER, CONTEXT_HANGAR),
    'session_stats': (SECTION_MARKS, CONTEXT_HANGAR),
    'battle_results': (SECTION_MARKS, CONTEXT_ANY),
    'last_battle': (SECTION_MARKS, CONTEXT_BATTLE),
    'hangar_marks': (SECTION_MARKS, CONTEXT_HANGAR),
    'hangar_tweaks': (SECTION_HANGAR, CONTEXT_HANGAR),
    'hangar_info': (SECTION_HANGAR, CONTEXT_ANY),
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
}
