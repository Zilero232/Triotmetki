import type {
  ArmorHit,
  ArmorTrace,
  ArmorTraceLayer,
  ArmorVerdict,
  CalculateArmorHitInput,
  HollowPlateInput,
  PenetratesAtInput,
  PenetrationAtDistanceInput,
  PenetrationChanceInput,
  PenetrationVerdictInput,
  RollChanceInput,
  ShellKind,
  ThresholdFactorInput,
  TraceArmorRayInput,
  TraceRun,
  TraceRunInput
} from './penetration.types';

import { ARMOR_FLAGS } from '../armor-model/armor-model.constants';
import { ERF_APPROXIMATION, PENETRATION, SHELL_KIND_ALIASES, SHELL_KINDS, SHELL_RULES } from './penetration.constants';

const RADIANS = Math.PI / 180;

const SHIELD_MASK = ARMOR_FLAGS.spaced | ARMOR_FLAGS.track | ARMOR_FLAGS.module;

const NO_RICOCHET_MASK = ARMOR_FLAGS.track | ARMOR_FLAGS.module;

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

const erf = (value: number): number => {
  const { p, a1, a2, a3, a4, a5 } = ERF_APPROXIMATION;
  const x = Math.abs(value);
  const t = 1 / (1 + p * x);
  const result = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return value < 0 ? -result : result;
};

const normalCdf = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));

export const rollChance = ({ threshold, randomness }: RollChanceInput): number => {
  const needed = threshold - 1;

  if (needed <= -randomness) {
    return 1;
  }

  if (needed > randomness) {
    return 0;
  }

  const sigma = randomness * PENETRATION.sigmaShare;
  const low = normalCdf(-randomness / sigma);
  const high = normalCdf(randomness / sigma);

  return clampUnit((high - normalCdf(needed / sigma)) / (high - low));
};

export const penetrationChance = ({ penetration, effective, randomness }: PenetrationChanceInput): number => {
  if (effective <= 0) {
    return 1;
  }

  return penetration > 0 ? rollChance({ threshold: effective / penetration, randomness }) : 0;
};

const KNOWN_KINDS: ReadonlySet<string> = new Set(SHELL_KINDS);

const isShellKind = (kind: string): kind is ShellKind => KNOWN_KINDS.has(kind);

export const toShellKind = (kind: string | undefined): ShellKind => {
  if (kind === undefined) {
    return 'ARMOR_PIERCING';
  }

  return isShellKind(kind) ? kind : (SHELL_KIND_ALIASES[kind] ?? 'ARMOR_PIERCING');
};

export const penetrationAtDistance = ({ kind, at100m, at500m, distance }: PenetrationAtDistanceInput): number => {
  if (!SHELL_RULES[kind].distanceFalloff) {
    return at100m;
  }

  const progress = clampUnit((distance - PENETRATION.falloffNear) / (PENETRATION.falloffFar - PENETRATION.falloffNear));

  return at100m + (at500m - at100m) * progress;
};

export const penetrationVerdict = ({ penetration, effective, randomness }: PenetrationVerdictInput): ArmorVerdict => {
  if (penetration * (1 - randomness) >= effective) {
    return 'pen';
  }

  return penetration * (1 + randomness) < effective ? 'noPen' : 'chance';
};

const isShieldPlate = (flags: number): boolean => (flags & SHIELD_MASK) !== 0;

const isHollowPlate = ({ thickness, flags }: HollowPlateInput): boolean => thickness <= 0 || (flags & ARMOR_FLAGS.hollow) !== 0;

export const calculateArmorHit = ({ thickness, angle, shell, flags = 0, randomness = PENETRATION.randomness }: CalculateArmorHitInput): ArmorHit => {
  const rules = SHELL_RULES[shell.kind];
  const impact = Math.min(90, Math.max(0, angle));

  if (isHollowPlate({ thickness, flags })) {
    return { angle: impact, normalizedAngle: impact, effective: 0, overmatch: false, canRicochet: false, ricochet: false, verdict: 'hollow' };
  }

  if (rules.ricochetAngle === null) {
    return {
      angle: impact,
      normalizedAngle: 0,
      effective: thickness,
      overmatch: false,
      canRicochet: false,
      ricochet: false,
      verdict: penetrationVerdict({ penetration: shell.penetration, effective: thickness, randomness })
    };
  }

  const overmatch = rules.caliberRules && shell.caliber > PENETRATION.overmatchRatio * thickness;
  const canRicochet = !overmatch && (flags & NO_RICOCHET_MASK) === 0;
  const ricochet = canRicochet && impact >= rules.ricochetAngle;
  const twoCaliber = rules.caliberRules && shell.caliber > PENETRATION.twoCaliberRatio * thickness;
  const normalization = rules.normalization * (twoCaliber ? (PENETRATION.twoCaliberFactor * shell.caliber) / (2 * thickness) : 1);
  const normalizedAngle = Math.max(0, impact - normalization);
  const effective = Math.min(PENETRATION.maxEffective, thickness / Math.max(Math.cos(normalizedAngle * RADIANS), Number.EPSILON));

  return {
    angle: impact,
    normalizedAngle,
    effective,
    overmatch,
    canRicochet,
    ricochet,
    verdict: ricochet ? 'ricochet' : penetrationVerdict({ penetration: shell.penetration, effective, randomness })
  };
};

const runTrace = ({ layers, shell }: TraceRunInput): TraceRun => {
  const rules = SHELL_RULES[shell.kind];
  const traced: ArmorTraceLayer[] = [];
  let remaining = shell.penetration;
  let jetActive = false;
  let total = 0;

  for (const [index, layer] of layers.entries()) {
    if (jetActive) {
      remaining *= Math.max(0, 1 - rules.jetLossPerMeter * layer.gap);
    }

    const hit = calculateArmorHit({ ...layer, shell: { ...shell, penetration: remaining }, randomness: 0 });

    traced.push({ ...hit, thickness: layer.thickness, flags: layer.flags, penetration: remaining });

    if (hit.verdict === 'hollow') {
      continue;
    }

    if (hit.ricochet) {
      return { layers: traced, mainIndex: -1, total, remaining, outcome: 'ricochet' };
    }

    total += hit.effective;

    if (!isShieldPlate(layer.flags)) {
      return { layers: traced, mainIndex: index, total, remaining, outcome: remaining >= hit.effective ? 'pen' : 'noPen' };
    }

    remaining = rules.ricochetAngle === null ? Math.max(0, remaining - layer.thickness) / PENETRATION.heShieldReduction : remaining - hit.effective;

    if (remaining <= 0) {
      return { layers: traced, mainIndex: -1, total, remaining: 0, outcome: 'noPen' };
    }

    jetActive = rules.jetLossPerMeter > 0;
  }

  return { layers: traced, mainIndex: -1, total, remaining, outcome: 'hollow' };
};

const penetratesAt = ({ layers, shell, factor }: PenetratesAtInput): boolean =>
  runTrace({ layers, shell: { ...shell, penetration: shell.penetration * factor } }).outcome === 'pen';

const thresholdFactor = ({ layers, shell, randomness }: ThresholdFactorInput): number => {
  let low = 1 - randomness;
  let high = 1 + randomness;

  for (let step = 0; step < PENETRATION.chanceIterations; step += 1) {
    const middle = (low + high) / 2;

    if (penetratesAt({ layers, shell, factor: middle })) {
      high = middle;
    } else {
      low = middle;
    }
  }

  return high;
};

export const traceArmorRay = ({ layers, shell, randomness = PENETRATION.randomness }: TraceArmorRayInput): ArmorTrace => {
  const { outcome, ...trace } = runTrace({ layers, shell });

  if (outcome === 'ricochet' || outcome === 'hollow') {
    return { ...trace, verdict: outcome, chance: 0 };
  }

  if (penetratesAt({ layers, shell, factor: 1 - randomness })) {
    return { ...trace, verdict: 'pen', chance: 1 };
  }

  if (!penetratesAt({ layers, shell, factor: 1 + randomness })) {
    return { ...trace, verdict: 'noPen', chance: 0 };
  }

  return { ...trace, verdict: 'chance', chance: rollChance({ threshold: thresholdFactor({ layers, shell, randomness }), randomness }) };
};
