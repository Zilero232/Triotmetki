import type { ScoredLine } from '../lib/competition-scoring/competition-scoring.types';
import type { CompetitionBattleRow } from '../queries/competition-battles.types';

export const toScoredLine = (battle: CompetitionBattleRow): ScoredLine => ({
  damage: battle.damageDealt,
  assist: battle.damageAssistedRadio + battle.damageAssistedTrack,
  blocked: battle.damageBlocked,
  frags: battle.frags,
  spotted: battle.spotted,
  xp: battle.xp,
  wins: battle.result === 'win' ? 1 : 0,
  survived: battle.survived ? 1 : 0
});
