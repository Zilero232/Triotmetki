import type { UiIconName } from '@/shared/lib/icon-sprite';

import type { SECTION } from './section.constants';

export const SECTION_ICONS: Record<(typeof SECTION)[keyof typeof SECTION], UiIconName> = {
  battle: 'swords',
  hangar: 'warehouse',
  replays: 'clapperboard',
  data: 'globe',
  profiles: 'layers',
  hud: 'layout-dashboard'
};

export const COMPONENT_ICONS: Partial<Record<string, UiIconName>> = {
  companion: 'link',
  marks_panel: 'gauge',
  damage_log: 'scroll-text',
  team_hp: 'heart-pulse',
  sixth_sense: 'lightbulb',
  battle_clock: 'timer',
  battle_progress: 'trophy',
  gun_arc: 'move-horizontal',
  bush_circle: 'trees',
  aim_info: 'goal',
  platoon_points: 'users',
  responsive_reticle: 'crosshair',
  battle_hotkeys: 'keyboard',
  battle_menu: 'sliders-horizontal',
  battle_loadout: 'wrench',
  minimap: 'map',
  crosshair: 'crosshair',
  camera: 'video',
  chat_filter: 'message-square-off',
  streamer_mode: 'eye-off',
  hangar_cleaner: 'eraser',
  session_stats: 'chart-column',
  battle_results: 'clipboard-list',
  last_battle: 'shield-alert',
  hit_viewer: 'target',
  hangar_marks: 'medal',
  hangar_tweaks: 'sliders-horizontal',
  hangar_info: 'info',
  personal_missions: 'list-checks',
  auto_resupply: 'refresh-cw',
  quick_demount: 'package',
  depot_seller: 'warehouse',
  auto_reserves: 'zap',
  crew_xp: 'users-round',
  hangar_space: 'layers',
  update_notice: 'download',
  notification_filter: 'bell-off',
  replay_manager: 'film',
  replay_upload: 'cloud-upload',
  free_camera: 'video'
};

export const FALLBACK_COMPONENT_ICON: UiIconName = 'puzzle';
