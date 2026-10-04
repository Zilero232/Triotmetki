import { defineHudWidget } from '../../../../../shared/lib/hud-widget';
import { aimArmorSchema, AimArmorWidget } from '../../../aim-armor';
import { battleClockSchema, BattleClockWidget } from '../../../battle-clock';
import { battleLoadoutSchema, BattleLoadoutWidget } from '../../../battle-loadout';
import { battleSummarySchema, BattleSummaryWidget } from '../../../battle-summary';
import { cardSchema, CardWidget } from '../../../card';
import { clockStripSchema, ClockStripWidget } from '../../../clock-strip';
import { crosshairSchema, CrosshairWidget } from '../../../crosshair';
import { damageLogSchema, DamageLogWidget } from '../../../damage-log';
import { gunArcSchema, GunArcWidget } from '../../../gun-arc';
import { marksPanelSchema, MarksPanelWidget } from '../../../marks-panel';
import { optionNoticeSchema, OptionNoticeWidget } from '../../../option-notice';
import { platoonPointsSchema, PlatoonPointsWidget } from '../../../platoon-points';
import { sixthSenseSchema, SixthSenseWidget } from '../../../sixth-sense';
import { teamHpSchema, TeamHpWidget } from '../../../team-hp';

export const WIDGET_ENTRIES = [
  defineHudWidget({ kind: 'team_hp', schema: teamHpSchema, Component: TeamHpWidget }),
  defineHudWidget({ kind: 'damage_log', schema: damageLogSchema, Component: DamageLogWidget }),
  defineHudWidget({ kind: 'marks_panel', schema: marksPanelSchema, Component: MarksPanelWidget }),
  defineHudWidget({ kind: 'gun_arc', schema: gunArcSchema, Component: GunArcWidget }),
  defineHudWidget({ kind: 'aim_armor', schema: aimArmorSchema, Component: AimArmorWidget }),
  defineHudWidget({ kind: 'battle_loadout', schema: battleLoadoutSchema, Component: BattleLoadoutWidget, pointer: true }),
  defineHudWidget({ kind: 'battle_summary', schema: battleSummarySchema, Component: BattleSummaryWidget, pointer: true }),
  defineHudWidget({ kind: 'option_notice', schema: optionNoticeSchema, Component: OptionNoticeWidget }),
  defineHudWidget({ kind: 'sixth_sense', schema: sixthSenseSchema, Component: SixthSenseWidget }),
  defineHudWidget({ kind: 'battle_clock', schema: battleClockSchema, Component: BattleClockWidget }),
  defineHudWidget({ kind: 'clock_strip', schema: clockStripSchema, Component: ClockStripWidget }),
  defineHudWidget({ kind: 'platoon_points', schema: platoonPointsSchema, Component: PlatoonPointsWidget }),
  defineHudWidget({ kind: 'crosshair', schema: crosshairSchema, Component: CrosshairWidget }),
  defineHudWidget({ kind: 'card', schema: cardSchema, Component: CardWidget })
];
