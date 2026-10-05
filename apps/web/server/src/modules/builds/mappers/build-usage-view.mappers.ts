import type { BuildHistoryEntry, BuildUsage, ProvisionOption, ProvisionPick } from '@otmetki/schemas';

import { BUILD_USAGE } from '@otmetki/schemas';
import { firstBy, uniqueBy } from 'remeda';

import type {
  CatalogPicks,
  CatalogPicksInput,
  HistoryEntryInput,
  ResolvePicksInput,
  ShellInfo,
  ShellInfoInput,
  StoredPick,
  ToBuildUsageInput
} from './build-usage-view.types';

import { storedBuildUsageSchema } from '../../collector';
import { BUILD_SLOTS } from '../config/provisions.constants';
import { RECOMMENDED_BUILD } from '../config/recommended.constants';

export const shellInfoOf = ({ turrets }: ShellInfoInput): Map<number, ShellInfo> =>
  new Map(
    turrets.flatMap((turret) =>
      turret.guns.flatMap((gun) =>
        gun.shots.flatMap((shot) =>
          shot.shellId === undefined
            ? []
            : [[shot.shellId, { name: shot.shell, kind: shot.kind ?? null, isPremium: shot.isPremium ?? false }] as const]
        )
      )
    )
  );

const pickOf =
  (byId: ReadonlyMap<number, ProvisionOption>) =>
  ({ id, ...stats }: StoredPick): ProvisionPick[] => {
    const option = byId.get(id);

    return option ? [{ option, ...stats }] : [];
  };

export const toBuildUsage = ({ row, options, shells, mode, cohort }: ToBuildUsageInput): BuildUsage => {
  const battles = row?.battles ?? 0;
  const isEnough = battles >= BUILD_USAGE.minSample;
  const parsed = row && isEnough ? storedBuildUsageSchema.safeParse(row.usage) : null;
  const stored = parsed?.success ? parsed.data : null;

  const base = {
    mode,
    cohort,
    battles,
    players: row?.players ?? 0,
    minSample: BUILD_USAGE.minSample,
    isEnough: stored !== null,
    windowDays: row?.windowDays ?? BUILD_USAGE.windowDays,
    gameVersion: row?.gameVersion ?? null,
    computedAt: row?.computedAt.toISOString() ?? null,
    winRate: stored ? (row?.winRate ?? null) : null,
    avgDamage: stored ? (row?.avgDamage ?? null) : null
  };

  if (!stored) {
    return { ...base, equipment: [], consumables: [], directives: [], shells: [], fieldModifications: [], crew: [] };
  }

  const toPick = pickOf(new Map([...options.optionalDevices, ...options.consumables, ...options.directives].map((option) => [option.id, option])));
  const tagPicks = new Map(stored.fieldModifications.map((pick) => [pick.tag, pick]));
  const skills = new Map(options.crewSkills.map((skill) => [skill.skill, skill]));

  return {
    ...base,
    equipment: stored.equipment.map((slot) => ({ slot: slot.slot, picks: slot.picks.flatMap(toPick) })).filter((slot) => slot.picks.length > 0),
    consumables: stored.consumables.flatMap(toPick),
    directives: stored.directives.flatMap(toPick),
    shells: stored.shells.map((shell) => {
      const info = shells.get(shell.shellId);

      return { ...shell, name: info?.name ?? null, kind: info?.kind ?? null, isPremium: info?.isPremium ?? false };
    }),
    fieldModifications: options.fieldModifications.flatMap((step) => {
      const picks = step.options.flatMap((option): ProvisionPick[] => {
        const pick = tagPicks.get(option.tag);

        return pick ? [{ option, battles: pick.battles, share: pick.share, winRate: pick.winRate, avgDamage: pick.avgDamage }] : [];
      });

      return picks.length > 0 ? [{ level: step.level, kind: step.kind, picks }] : [];
    }),
    crew: stored.crew.map((role) => ({
      role: role.role,
      members: role.members,
      skills: role.skills.flatMap((entry) => {
        const skill = skills.get(entry.skill);

        return skill
          ? [
              {
                skill: entry.skill,
                name: skill.name,
                image: skill.image,
                isCommon: skill.isCommon,
                share: entry.share,
                avgPosition: entry.avgPosition
              }
            ]
          : [];
      })
    }))
  };
};

const slotLeaders = (equipment: readonly { picks: readonly ProvisionPick[] }[]): ProvisionPick[] =>
  uniqueBy(
    equipment.flatMap((slot) => slot.picks.slice(0, 1)),
    (pick) => pick.option.id
  );

export const historyEntryOf = ({ usage, gameVersion, computedAt }: HistoryEntryInput): BuildHistoryEntry => ({
  gameVersion,
  computedAt,
  battles: usage.battles,
  players: usage.players,
  winRate: usage.winRate,
  equipment: slotLeaders(usage.equipment),
  consumables: usage.consumables.slice(0, BUILD_USAGE.catalogTopPicks),
  directives: usage.directives.slice(0, BUILD_SLOTS.directives),
  fieldModifications: usage.fieldModifications.flatMap((step) => {
    const best = firstBy(step.picks, [(pick) => pick.share, 'desc']);

    return best && best.share >= RECOMMENDED_BUILD.minShare ? [best] : [];
  })
});

export const catalogPicksOf = ({ usage, battles }: CatalogPicksInput): CatalogPicks => {
  const parsed = battles >= BUILD_USAGE.minSample ? storedBuildUsageSchema.safeParse(usage) : null;

  if (!parsed?.success) {
    return { equipment: [], consumables: [] };
  }

  return {
    equipment: uniqueBy(
      parsed.data.equipment.flatMap((slot) => slot.picks.slice(0, 1)),
      (pick) => pick.id
    ).slice(0, BUILD_USAGE.catalogTopPicks),
    consumables: parsed.data.consumables.slice(0, BUILD_USAGE.catalogTopPicks)
  };
};

export const resolvePicks = ({ picks, options }: ResolvePicksInput): ProvisionPick[] => picks.flatMap(pickOf(options));
