import { describe, expect, it } from 'vitest';

import { bonusTypesOfMode } from '../../../../../common/lib';
import { corroboratedBattleSql, ownerTrustedBattleSql } from '../../../../mod';
import { competitionBattlesSql } from '../competition-battles';

const INPUT = { accountId: 1n, from: new Date('2026-09-01T00:00:00.000Z'), until: new Date('2026-09-08T00:00:00.000Z'), limit: 100 };

describe('competitionBattlesSql', () => {
  it('scores only corroborated mod battles', () => {
    expect(competitionBattlesSql({ ...INPUT, battleTypes: bonusTypesOfMode('random') }).sql).toContain(corroboratedBattleSql.sql);
  });

  it('does not score a frontline battle on the owner signature alone', () => {
    const query = competitionBattlesSql({ ...INPUT, battleTypes: bonusTypesOfMode('frontline') });

    expect(query.sql).not.toContain(ownerTrustedBattleSql.sql);
  });
});
