import { CrosshairIcon, EquipStandardIcon, Mark3Icon, OnslaughtIcon, RadioIcon } from '@otmetki/icons';
import {
  BadgeCheck,
  BellOff,
  BellRing,
  CalendarClock,
  ChartColumn,
  CircleDashed,
  CloudUpload,
  Coins,
  Crosshair,
  EyeOff,
  Film,
  Focus,
  GraduationCap,
  HeartPulse,
  House,
  Keyboard,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  MapIcon,
  Medal,
  MessageSquareOff,
  MessageSquareText,
  MoveHorizontal,
  PackageMinus,
  RefreshCw,
  ScrollText,
  Server,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sunset,
  Swords,
  Target,
  Users,
  Video,
  Warehouse,
  Zap,
  ZoomIn
} from 'lucide-react';

export const MOD_SHOWCASE = [
  {
    id: 'battle',
    icon: Swords,
    items: [
      { id: 'damage_log', icon: Swords, context: 'battle', isDefault: true },
      { id: 'team_hp', icon: HeartPulse, context: 'battle', isDefault: true },
      { id: 'sixth_sense', icon: Lightbulb, context: 'battle', isDefault: true },
      { id: 'pack_badge', icon: Shield, context: 'battle', isDefault: true },
      { id: 'battle_loadout', icon: EquipStandardIcon, context: 'battle', isDefault: true },
      { id: 'gun_arc', icon: MoveHorizontal, context: 'battle', isDefault: false },
      { id: 'bush_circle', icon: CircleDashed, context: 'battle', isDefault: false },
      { id: 'aim_info', icon: Target, context: 'battle', isDefault: true },
      { id: 'platoon_points', icon: Users, context: 'battle', isDefault: false },
      { id: 'responsive_reticle', icon: Focus, context: 'battle', isDefault: true },
      { id: 'battle_hotkeys', icon: Keyboard, context: 'battle', isDefault: false },
      { id: 'crosshair', icon: CrosshairIcon, context: 'battle', isDefault: true },
      { id: 'camera', icon: ZoomIn, context: 'battle', isDefault: true },
      { id: 'minimap', icon: MapIcon, context: 'battle', isDefault: true },
      { id: 'hud_layouts', icon: LayoutDashboard, context: 'battle', isDefault: true },
      { id: 'chat_filter', icon: MessageSquareOff, context: 'battle', isDefault: false },
      { id: 'auto_messages', icon: MessageSquareText, context: 'battle', isDefault: true }
    ]
  },
  {
    id: 'hangar',
    icon: Warehouse,
    items: [
      { id: 'hangar_tweaks', icon: SlidersHorizontal, context: 'hangar', isDefault: false },
      { id: 'hangar_info', icon: Server, context: 'hangar', isDefault: true },
      { id: 'hangar_cleaner', icon: Sparkles, context: 'hangar', isDefault: false },
      { id: 'notification_filter', icon: BellOff, context: 'hangar', isDefault: false },
      { id: 'auto_resupply', icon: RefreshCw, context: 'hangar', isDefault: false },
      { id: 'quick_demount', icon: PackageMinus, context: 'hangar', isDefault: false },
      { id: 'personal_missions', icon: ListChecks, context: 'hangar', isDefault: true },
      { id: 'comp7_helper', icon: OnslaughtIcon, context: 'hangar', isDefault: true },
      { id: 'event_trackers', icon: CalendarClock, context: 'hangar', isDefault: false },
      { id: 'depot_seller', icon: Coins, context: 'hangar', isDefault: false },
      { id: 'auto_reserves', icon: Zap, context: 'hangar', isDefault: false },
      { id: 'crew_xp', icon: GraduationCap, context: 'hangar', isDefault: true },
      { id: 'hangar_space', icon: House, context: 'hangar', isDefault: false },
      { id: 'hangar_looks', icon: Sunset, context: 'hangar', isDefault: false },
      { id: 'hit_viewer', icon: Crosshair, context: 'hangar', isDefault: true },
      { id: 'update_notice', icon: BellRing, context: 'hangar', isDefault: true },
      { id: 'preset_advisor', icon: BadgeCheck, context: 'hangar', isDefault: true }
    ]
  },
  {
    id: 'marks',
    icon: Mark3Icon,
    items: [
      { id: 'marks_panel', icon: Mark3Icon, context: 'any', isDefault: true },
      { id: 'battle_progress', icon: Medal, context: 'battle', isDefault: false },
      { id: 'session_stats', icon: ChartColumn, context: 'hangar', isDefault: true },
      { id: 'battle_results', icon: ScrollText, context: 'any', isDefault: true }
    ]
  },
  {
    id: 'replays',
    icon: Film,
    items: [
      { id: 'replay_manager', icon: Film, context: 'hangar', isDefault: true },
      { id: 'replay_upload', icon: CloudUpload, context: 'hangar', isDefault: false },
      { id: 'free_camera', icon: Video, context: 'any', isDefault: false }
    ]
  },
  {
    id: 'streamers',
    icon: RadioIcon,
    items: [{ id: 'streamer_mode', icon: EyeOff, context: 'any', isDefault: false }]
  }
] as const;

export const MOD_SHOWCASE_BASE = ['core', 'companion', 'ui'] as const;

export const MOD_SHOWCASE_CONTEXT_TONE = {
  battle: 'battle',
  hangar: 'olive',
  any: 'steel'
} as const;
