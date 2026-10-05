import type { ShellStats } from '@otmetki/schemas';

import { match, P } from 'ts-pattern';

import type { LiveValueInput, ShellForInput } from './live-value.types';

import { SHELL_QUALIFIERS } from '../../config/params.constants';

const shellFor = ({ stats, label }: ShellForInput): ShellStats | null => {
  const qualifier = SHELL_QUALIFIERS.find((entry) => entry.pattern.test(label));

  if (!qualifier) {
    return stats.shell;
  }

  return stats.shells.find((shell) => shell.kind === qualifier.kind) ?? null;
};

export const liveValue = ({ param, label, stats }: LiveValueInput): number | null => {
  if (!stats || param === null) {
    return null;
  }

  const shell = (): ShellStats | null => shellFor({ stats, label });

  return match(param)
    .with(
      P.union(
        'reloadTime',
        'aimingTime',
        'dispersion',
        'dispersionMovement',
        'dispersionHullRotation',
        'dispersionTurretRotation',
        'rateOfFire',
        'maxHealth',
        'viewRange',
        'radioRange',
        'speedForward',
        'speedBackward',
        'hullTraverse',
        'turretTraverse',
        'enginePower',
        'powerToWeight',
        'weight'
      ),
      (key) => stats[key]
    )
    .with('clipReloadTime', () => stats.clip?.reloadTime ?? null)
    .with('clipInterval', () => stats.clip?.interval ?? null)
    .with(P.union('depression', 'elevation'), (key) => {
      const angle = stats[key];

      return angle === null ? null : Math.abs(angle);
    })
    .with('shellDamage', () => shell()?.damage ?? null)
    .with('shellPenetration', () => shell()?.penetration100m ?? null)
    .with('shellVelocity', () => shell()?.speed ?? null)
    .with('damagePerMinute', () => shell()?.damagePerMinute ?? null)
    .otherwise(() => null);
};
