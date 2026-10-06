import { describe, expect, it } from 'vitest';

import { lookTitle, skippedLooks } from '@/entities/hangar-looks';

describe('skippedLooks', () => {
  it('titles each skipped look by its id and keeps the reason', () => {
    expect(
      skippedLooks({
        skipped: [
          { id: 'night', reason: 'untested_client' },
          { id: 'steel_rain', reason: 'missing_texture' }
        ]
      })
    ).toEqual([
      { id: 'night', title: 'Night', reason: 'untested_client' },
      { id: 'steel_rain', title: 'Steel rain', reason: 'missing_texture' }
    ]);
  });

  it('leaves out an entry without an id (a recipes file that did not parse)', () => {
    expect(skippedLooks({ skipped: [{ id: '', reason: 'unsupported_schema' }] })).toEqual([]);
    expect(lookTitle('x')).toBe('X');
  });
});
