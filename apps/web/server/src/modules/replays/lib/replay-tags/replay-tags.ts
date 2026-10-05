import type { ReplayTag } from '@otmetki/schemas';

import { REPLAY_TAG_RULES } from '@otmetki/schemas';
import { isNonNullish, sumBy, unique } from 'remeda';

import type { ReplaySummary } from '../../../../lib/replay';
import type { AliveAtInput, Fighter, ReplayTagColumns, TagContext } from './replay-tags.types';

import { REPLAY_TAGGING } from '../../config/tagging.constants';

const toFighters = (summary: ReplaySummary): Fighter[] | null => {
  const fighters = summary.players.flatMap((player): Fighter[] =>
    player.result
      ? [
          {
            team: player.team,
            isRecorder: player.isRecorder,
            diedAt: player.result.survived ? null : player.result.lifeTimeSeconds,
            damage: player.result.damageDealt,
            frags: player.result.frags,
            capturePoints: player.result.capturePoints,
            maxHealth: player.maxHealth
          }
        ]
      : []
  );

  return fighters.length === summary.players.length ? fighters : null;
};

const aliveAt = ({ fighters, team, at }: AliveAtInput): number =>
  fighters.filter((fighter) => fighter.team === team && (fighter.diedAt === null || fighter.diedAt > at)).length;

const isKolobanov = ({ fighters, recorder, allies, enemyTeam }: TagContext): boolean => {
  const allyDeaths = allies.map((ally) => ally.diedAt);

  if (recorder.diedAt !== null || allyDeaths.length === 0 || !allyDeaths.every(isNonNullish)) {
    return false;
  }

  return aliveAt({ fighters, team: enemyTeam, at: Math.max(...allyDeaths) }) >= REPLAY_TAG_RULES.kolobanov.minEnemiesAlive;
};

const isComeback = ({ fighters, recorder, enemyTeam }: TagContext): boolean =>
  unique(fighters.flatMap((fighter) => (fighter.diedAt === null ? [] : [fighter.diedAt]))).some(
    (at) => aliveAt({ fighters, team: enemyTeam, at }) - aliveAt({ fighters, team: recorder.team, at }) >= REPLAY_TAG_RULES.comeback.minDeficit
  );

const isRaider = ({ recorder, finishReason }: TagContext): boolean =>
  finishReason === REPLAY_TAGGING.baseCaptureFinishReason && recorder.capturePoints >= REPLAY_TAG_RULES.raider.minCapturePoints;

const isHighCaliber = ({ fighters, recorder, enemies }: TagContext): boolean => {
  const others = fighters.filter((fighter) => !fighter.isRecorder);
  const enemyHealth = enemies.map((enemy) => enemy.maxHealth);

  if (recorder.damage <= 0 || enemyHealth.length === 0 || !enemyHealth.every(isNonNullish)) {
    return false;
  }

  return (
    others.every((fighter) => fighter.damage < recorder.damage) &&
    recorder.damage >= REPLAY_TAG_RULES.highCaliber.minShareOfEnemyHealth * sumBy(enemyHealth, (health) => health)
  );
};

const isWarrior = ({ recorder, allies }: TagContext): boolean =>
  recorder.frags >= REPLAY_TAG_RULES.warrior.minFrags && allies.every((ally) => ally.frags <= recorder.frags);

const RULES: ReadonlyArray<[ReplayTag, (context: TagContext) => boolean]> = [
  ['kolobanov', isKolobanov],
  ['comeback', isComeback],
  ['raider', isRaider],
  ['highCaliber', isHighCaliber],
  ['warrior', isWarrior]
];

export const replayTags = (summary: ReplaySummary): ReplayTag[] => {
  const fighters = toFighters(summary);
  const recorder = fighters?.find((fighter) => fighter.isRecorder);

  if (!fighters || !recorder || summary.outcome !== 'win') {
    return [];
  }

  const context: TagContext = {
    fighters,
    recorder,
    allies: fighters.filter((fighter) => fighter.team === recorder.team && !fighter.isRecorder),
    enemies: fighters.filter((fighter) => fighter.team !== recorder.team),
    enemyTeam: fighters.find((fighter) => fighter.team !== recorder.team)?.team ?? recorder.team,
    finishReason: summary.finishReason
  };

  return RULES.flatMap(([tag, rule]) => (rule(context) ? [tag] : []));
};

export const replayTagColumns = (summary: ReplaySummary): ReplayTagColumns => {
  const recorder = summary.players.find((player) => player.isRecorder) ?? null;
  const blocked = recorder?.result?.blocked;

  return {
    tags: replayTags(summary),
    clanTag: recorder?.clanTag || null,
    damageBlocked: blocked === undefined ? null : Math.max(0, Math.round(blocked)),
    markOfMastery: summary.recorder.markOfMastery ?? null,
    tagsVersion: REPLAY_TAGGING.version
  };
};
