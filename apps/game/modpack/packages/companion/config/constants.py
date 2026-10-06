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
    'hangar_info',
    'battle_chat_filter',
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
    'battle_menu_entry',
    'battle_hud_layouts',
    'battle_aim_info',
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
# Off until the player turns them on (docs/specs/2026-09-30-hud-consolidation-and-design.md section 0): the uploads
# (privacy), what needs a site binding before it shows anything, the niche panels, and whatever overrides a client
# view or sends client requests without a preset the leading packs agree on.
OPT_IN_FEATURES = (
    'upload_replays',
    'publish_replays',
    'share_session_report',
    'battle_progress',
    'battle_gun_arc',
    'battle_platoon_points',
    'battle_hotkeys',
    'battle_bush_circle',
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
)
SHARE_CHANNELS = ('telegram', 'discord', 'both')
# config.json keeps every default it was written with: a switch whose default changed is moved to the new
# one when it still holds the old default and the file predates the change (`defaults_revision`).
# (revision, key, old default, new default). A switch of a removed component is left out of DEFAULTS: Settings ignores
# a key its schema does not know, so the leftover drops out of the file on the next save.
DEFAULTS_REVISION = 5
RETIRED_DEFAULTS = (
    (1, 'battle_loadout', False, True),
    (3, 'hangar_tweaks', True, False),
    (3, 'battle_chat_filter', True, False),
    (3, 'hangar_auto_resupply', True, False),
    (3, 'hangar_notification_filter', True, False),
    (3, 'hangar_cleaner', True, False),
    (3, 'streamer_mode', True, False),
    (3, 'battle_bush_circle', True, False),
)
# Switches set once for every file older than the revision, whatever they hold: revision 1 missed the files already
# stamped with it, so the equipment row stayed off. The stamp records it, and a switch the player turns off
# afterwards is kept. (revision, key, value).
ONE_TIME_SWITCHES = (
    (2, 'battle_loadout', True),
)
# Revision 3 (docs/specs/2026-09-30-hud-consolidation-and-design.md section 0): the components merged into one another
# and the ones removed. It runs on the stored config.json and components.json before any feature reads them; the later
# revisions (RETIRED_VALUES, DROPPED_SECTIONS) run on every file older than DEFAULTS_REVISION.
MIGRATION_REVISION = 3
COMPONENTS_FILE = 'components.json'
# The features' package next to the companion's (`gui.mods.otmetki` in the client), whose settings give the schema
# defaults.
FEATURES_PACKAGE = 'features'
# A switch whose default turned off stays on for a player who set its component up: (switch, components.json section).
GUARDED_SWITCHES = (
    ('hangar_tweaks', 'hangar_tweaks'),
    ('battle_chat_filter', 'chat_filter'),
    ('hangar_auto_resupply', 'auto_resupply'),
    ('hangar_notification_filter', 'notification_filter'),
    ('hangar_cleaner', 'hangar_cleaner'),
    ('battle_bush_circle', 'bush_circle'),
    ('streamer_mode', 'streamer_mode'),
)
# (surviving switch, the switches of the components merged into it): on when any of them was on.
MERGED_SWITCHES = (
    ('battle_damage_log', ('battle_hit_log', 'battle_received_hits')),
    ('battle_moe_panel', ('hangar_marks', 'hangar_marks_history')),
    ('battle_progress', ('battle_main_gun', 'battle_efficiency')),
    ('hangar_session_panel', ('hangar_session_goals', 'hangar_ratings')),
    ('hangar_battle_results', ('hangar_battle_hits',)),
    ('hangar_info', ('battle_clock',)),
)
# ((old section, old key, old default), (new section, new key)): copied only when the player changed it.
MERGED_SECTIONS = (
    (('hit_log', 'lines', 6), ('damage_log', 'dealt_lines')),
    (('damage_log', 'log_lines', 5), ('damage_log', 'dealt_lines')),
    (('received_hits', 'lines', 5), ('damage_log', 'received_lines')),
    (('hit_log', 'group_by_target', False), ('damage_log', 'group_by_target')),
    (('hit_log', 'alt_mode', False), ('damage_log', 'alt_mode')),
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
    (('battle_clock', 'replace_timer', False), ('hangar_info', 'replace_timer')),
    (('hangar_marks', 'style', 'extended'), ('marks_panel', 'hangar_style')),
    (('marks_history', 'show_panel', True), ('marks_panel', 'show_trend')),
    (('marks_history', 'trend_battles', 5), ('marks_panel', 'trend_battles')),
    (('hangar_ratings', 'show_tank', True), ('marks_panel', 'show_tank_ratings')),
)
# (section, ((merged switch, key), ...)): when any merged switch was on, each key takes its switch's value, so the
# survivor shows the parts the player had on.
SWITCHED_PARTS = (
    ('battle_progress', (
        ('battle_main_gun', 'row_main_gun'),
        ('battle_efficiency', 'row_wn8'),
    )),
)
# (switches of the merged components, section, key): what the player had switched off (every one of the switches) stays
# off as the part of its survivor that shows it. Read from the switches as stored, before the merge.
SWITCHED_OFF_PARTS = (
    (('hangar_session_goals',), 'session_stats', 'show_goals'),
    (('hangar_ratings',), 'session_stats', 'show_account'),
    (('hangar_battle_hits',), 'battle_results', 'hits_tab'),
    (('battle_moe_panel',), 'marks_panel', 'show_battle_panel'),
    (('hangar_marks', 'hangar_marks_history'), 'marks_panel', 'hangar_card'),
)
# (revision, section, key, old default, new default): moved in a file older than the revision, only while the key still
# holds the old default and the player never set it in the window. Revision 4: the crosshair keeps the game's own
# centre unless the player picks a mark (docs/research/competitors/2026-10-05-behavior-parity.md section 2).
RETIRED_VALUES = (
    (3, 'damage_log', 'alt_mode', False, True),
    (3, 'hangar_info', 'clock_format', '%H:%M:%S', '%H:%M'),
    (3, 'hangar_info', 'date_format', '%d.%m.%Y', '%d.%m'),
    (3, 'marks_panel', 'style', 'extended', 'compact'),
    (3, 'marks_panel', 'alt_detail', False, True),
    (4, 'crosshair', 'mark', 'chevron_thin', 'none'),
    (4, 'crew_xp', 'show_card', True, False),
    (5, 'crosshair', 'show_zoom', False, True),
)
# (revision, section, old default place, new default place) as (x, y, align_x, align_y): a component that is not a HUD
# panel (no RETIRED_PLACES of its own) moves in a file older than the revision only while it still sits at the old
# default; the rows apply in order, so an older file walks through every move. Revision 4: the clock strip goes top left
# under the header, where Battle Observer keeps its hangar clock.
MOVED_PLACES = (
    (3, 'hangar_info', (-16, 76, 'right', 'top'), (0, -196, 'left', 'bottom')),
    (4, 'hangar_info', (0, -196, 'left', 'bottom'), (50, 83, 'left', 'top')),
)
# Revision 5: the marks split into two components with their own options and settings page, as the packs keep the battle
# marks panel apart from the hangar marks info: the battle panel (section marks_panel, switch battle_moe_panel) and the
# hangar Tank card (section hangar_marks, switch hangar_tank_card). It runs on every file older than the revision.
SPLIT_REVISION = 5
# (switch, the switch it was under, (section, key) of its part's own switch): on only while both were on.
SPLIT_SWITCHES = (
    ('battle_moe_panel', 'battle_moe_panel', ('marks_panel', 'show_battle_panel')),
    ('hangar_tank_card', 'battle_moe_panel', ('marks_panel', 'hangar_card')),
)
# ((old section, old key), (new section, new key)): the stored value goes to its new section as it was (the defaults
# are the same); a key the old section does not hold leaves the new one at its default. The moved keys leave
# marks_panel through DROPPED_KEYS; alt_detail stays in both.
SPLIT_KEYS = (
    (('marks_panel', 'hangar_style'), ('hangar_marks', 'style')),
    (('marks_panel', 'alt_detail'), ('hangar_marks', 'alt_detail')),
    (('marks_panel', 'show_trend'), ('hangar_marks', 'show_trend')),
    (('marks_panel', 'trend_battles'), ('hangar_marks', 'trend_battles')),
    (('marks_panel', 'show_tank_ratings'), ('hangar_marks', 'show_tank_ratings')),
    (('marks_panel', 'show_mastery'), ('hangar_marks', 'show_mastery')),
    (('marks_panel', 'show_research'), ('hangar_marks', 'show_research')),
    (('marks_panel', 'carousel_percent'), ('hangar_marks', 'carousel_percent')),
)
# The sections of the removed components and panels (ComponentConfig keeps unknown sections, so they go here), dropped
# from every file older than DEFAULTS_REVISION. Revision 4: battle_summary (the card of the battle being played) and
# config_backup (the settings copy beside preferences.xml; core.durable keeps the files a wipe would lose).
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
)
# (section, key) of the removed options of components that stay, dropped from every file older than DEFAULTS_REVISION
# (a section of an installed component loses them on its next save anyway; this covers a component not installed).
# Revision 4: the crosshair's repair timers (the stock damage panel shows them), the update notice's hangar card
# (the ModsList badge and one message took its place) and aim_info's armour readout with the HUD panel only it drew
# (fair play: Lesta forbids in-battle armour analysis). Revision 5: the Tank card's options moved out of the battle
# marks panel (SPLIT_KEYS), with the part switches and the battles row the battle panel no longer has.
DROPPED_KEYS = (
    ('crosshair', 'repair_timers'),
    ('update_notice', 'show_card'),
    ('aim_info', 'armor_under_aim'),
    ('aim_info', 'show_nominal'),
    ('aim_info', 'show_piercing'),
    ('aim_info', 'show_angle'),
    ('aim_info', 'placement'),
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
)
# Components that stay but are no HUD panel any more, so their battle-type places go (revision 4: aim_info).
DROPPED_PANELS = ('aim_info',)
# The keys the player set in the settings window (config switches by name, component values as `<section>.<key>`),
# space-separated: a later default change never moves them.
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
    'hangar_info': True,
    'battle_chat_filter': False,
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
    'battle_menu_entry': True,
    'battle_hud_layouts': True,
    'battle_aim_info': True,
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
LOCAL_HOSTS = ('http://localhost', 'http://127.0.0.1')
# Settings that are no longer choices (docs/specs/2026-09-30-hud-consolidation-and-design.md section 12): the
# outbox sends every 15 s.
FIXED = {'flush_interval_seconds': 15}
