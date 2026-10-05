import { aimArmorSchema, AimArmorWidget } from '@/entities/hud/aim-armor';
import { battleClockSchema, BattleClockWidget } from '@/entities/hud/battle-clock';
import { battleLoadoutSchema, BattleLoadoutWidget } from '@/entities/hud/battle-loadout';
import { battleSummarySchema, BattleSummaryWidget } from '@/entities/hud/battle-summary';
import { cardSchema, CardWidget } from '@/entities/hud/card';
import { clockStripSchema, ClockStripWidget } from '@/entities/hud/clock-strip';
import { crosshairSchema, CrosshairWidget } from '@/entities/hud/crosshair';
import { damageLogSchema, DamageLogWidget } from '@/entities/hud/damage-log';
import { gunArcSchema, GunArcWidget } from '@/entities/hud/gun-arc';
import { marksPanelSchema, MarksPanelWidget } from '@/entities/hud/marks-panel';
import { optionNoticeSchema, OptionNoticeWidget } from '@/entities/hud/option-notice';
import { platoonPointsSchema, PlatoonPointsWidget } from '@/entities/hud/platoon-points';
import { sixthSenseSchema, SixthSenseWidget } from '@/entities/hud/sixth-sense';
import { teamHpSchema, TeamHpWidget } from '@/entities/hud/team-hp';

import { defineHudWidget } from '../define-widget';

export const WIDGET_ENTRIES = [
  defineHudWidget({ kind: 'team_hp', schema: teamHpSchema, Component: TeamHpWidget }),
  defineHudWidget({ kind: 'damage_log', schema: damageLogSchema, Component: DamageLogWidget }),
  defineHudWidget({ kind: 'marks_panel', schema: marksPanelSchema, Component: MarksPanelWidget }),
  defineHudWidget({ kind: 'gun_arc', schema: gunArcSchema, Component: GunArcWidget }),
  defineHudWidget({ kind: 'aim_armor', schema: aimArmorSchema, Component: AimArmorWidget }),
  defineHudWidget({ kind: 'battle_loadout', schema: battleLoadoutSchema, Component: BattleLoadoutWidget, pointer: true }),
  defineHudWidget({ kind: 'battle_summary', schema: battleSummarySchema, Component: BattleSummaryWidget }),
  defineHudWidget({ kind: 'option_notice', schema: optionNoticeSchema, Component: OptionNoticeWidget }),
  defineHudWidget({ kind: 'sixth_sense', schema: sixthSenseSchema, Component: SixthSenseWidget }),
  defineHudWidget({ kind: 'battle_clock', schema: battleClockSchema, Component: BattleClockWidget }),
  defineHudWidget({ kind: 'clock_strip', schema: clockStripSchema, Component: ClockStripWidget }),
  defineHudWidget({ kind: 'platoon_points', schema: platoonPointsSchema, Component: PlatoonPointsWidget }),
  defineHudWidget({ kind: 'crosshair', schema: crosshairSchema, Component: CrosshairWidget }),
  defineHudWidget({ kind: 'card', schema: cardSchema, Component: CardWidget })
];
