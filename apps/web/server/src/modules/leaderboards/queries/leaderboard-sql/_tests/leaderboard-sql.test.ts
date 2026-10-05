import { leaderboardQuerySchema } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import { marksSql } from '../leaderboard-sql';

const query = leaderboardQuerySchema.parse({ scope: 'marks' });

describe('marksSql', () => {
  it('counts only tanks the Lesta API reports battles on, so a mod cannot claim marks on tanks it never played', () => {
    const { page, total } = marksSql(query);

    expect(page.sql).toContain('pt.battles > 0');
    expect(total.sql).toContain('pt.battles > 0');
  });

  it('counts only marks read from Lesta, so a mod-reported mark never ranks', () => {
    const { page, total } = marksSql(query);

    expect(page.sql).toContain("pt.marks_source = 'lesta'");
    expect(total.sql).toContain("pt.marks_source = 'lesta'");
  });
});
