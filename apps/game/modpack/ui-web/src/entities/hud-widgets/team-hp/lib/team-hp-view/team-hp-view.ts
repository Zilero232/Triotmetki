import { isIncludedIn, reverse, sumBy } from 'remeda';

import type { TeamHpData, TeamHpVehicle } from '../../model/schemas';
import type {
  BehindInput,
  PaintInput,
  SideViewInput,
  TeamHpGap,
  TeamHpPaint,
  TeamHpScore,
  TeamHpSegment,
  TeamHpSideView,
  TeamHpStripVehicle,
  TeamHpTierLabel,
  TeamHpView
} from './team-hp-view.types';

import { barFill } from '../../../../../shared/lib/hud-bar';
import { formatNumber, formatSigned } from '../../../../../shared/lib/hud-format';
import { TEAM_HP } from '../../config';

const startsTierGroup = (vehicle: TeamHpVehicle, index: number): boolean => index > 0 && vehicle.tier !== null;

const segmentsOf = (vehicles: TeamHpVehicle[]): (TeamHpGap | TeamHpSegment)[] => {
  const total = sumBy(vehicles, (vehicle) => vehicle.max);
  const gaps = vehicles.filter(startsTierGroup).length;
  const room = TEAM_HP.barWidth - TEAM_HP.segmentGap * Math.max(0, vehicles.length - 1) - TEAM_HP.tierGap * gaps;

  return vehicles.flatMap((vehicle, index) => {
    const width = total > 0 ? Math.max(2, Math.round((vehicle.max / total) * room)) : 0;
    const segment: TeamHpSegment = {
      kind: 'segment',
      key: `segment-${index}`,
      width,
      fill: barFill({ value: vehicle.hp, max: vehicle.max, width }),
      alive: vehicle.alive
    };

    return startsTierGroup(vehicle, index) ? [{ kind: 'gap', key: `gap-${index}` } satisfies TeamHpGap, segment] : [segment];
  });
};

const stripOf = (vehicles: TeamHpVehicle[]): (TeamHpStripVehicle | TeamHpTierLabel)[] =>
  vehicles.flatMap((vehicle, index) => {
    const item: TeamHpStripVehicle = { kind: 'vehicle', key: `vehicle-${index}`, icon: vehicle.icon, alive: vehicle.alive };

    return vehicle.tier === null ? [item] : [{ kind: 'tier', key: `tier-${index}`, label: vehicle.tier } satisfies TeamHpTierLabel, item];
  });

const paintOf = ({ tone, color }: PaintInput): TeamHpPaint =>
  color === null ? { tone, text: undefined, fill: undefined } : { tone: null, text: { color }, fill: { backgroundColor: color } };

const isBehind = ({ side, other }: BehindInput): boolean => other.hp > 0 && side.hp < other.hp * TEAM_HP.behindShare;

const sideView = ({ side, other, vehicles, tone, color, mirrored }: SideViewInput): TeamHpSideView => {
  const behind = isBehind({ side, other });
  const paint = paintOf({ tone, color });
  const segments = segmentsOf(vehicles);
  const strip = stripOf(vehicles);

  return {
    hp: formatNumber(side.hp),
    behind,
    hpTone: behind ? 'warning' : paint.tone,
    hpStyle: behind ? undefined : paint.text,
    fill: barFill({ value: side.hp, max: side.max, width: TEAM_HP.barWidth }),
    segments: mirrored ? reverse(segments) : segments,
    strip: mirrored ? reverse(strip) : strip,
    paint
  };
};

const scoreOf = (data: TeamHpData): TeamHpScore => {
  const key = data.score_alive ? 'alive' : 'frags';

  return { allies: String(data.allies[key]), enemies: String(data.enemies[key]) };
};

export const teamHpView = (data: TeamHpData): TeamHpView => {
  const { style } = data;
  const singleRow = isIncludedIn(style, TEAM_HP.singleRowStyles);
  const strip = style === 'icons';
  const score = data.show_score || singleRow ? scoreOf(data) : null;
  const diff = data.diff === null || singleRow ? null : formatSigned(data.diff);

  return {
    numbers: isIncludedIn(style, TEAM_HP.numberStyles),
    bars: isIncludedIn(style, TEAM_HP.barStyles),
    segmented: isIncludedIn(style, TEAM_HP.segmentStyles) && data.vehicles.allies.length + data.vehicles.enemies.length > 0,
    strip,
    secondRow: strip || diff !== null,
    score,
    diff,
    diffTone: (data.diff ?? 0) >= 0 ? 'good' : 'bad',
    hasCenter: score !== null || diff !== null,
    allies: sideView({
      side: data.allies,
      other: data.enemies,
      vehicles: data.vehicles.allies,
      tone: data.tones.ally,
      color: data.colors.ally,
      mirrored: true
    }),
    enemies: sideView({
      side: data.enemies,
      other: data.allies,
      vehicles: data.vehicles.enemies,
      tone: data.tones.enemy,
      color: data.colors.enemy,
      mirrored: false
    })
  };
};
