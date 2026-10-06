import status from '@contract/hangar-looks-status.json';
import { describe, expect, it } from 'vitest';

import { hangarLooksStatusSchema } from '@/entities/hangar-looks';

describe('hangarLooksStatusSchema', () => {
  it('parses the looks the manager built for the client and the ones it skipped', () => {
    const parsed = hangarLooksStatusSchema.parse(status);

    expect(parsed).toMatchObject({ state: 'generated', clientVersion: '1.45.0.0', looks: ['night', 'studio'] });

    expect(parsed.skipped).toEqual([
      { id: 'sunset', reason: 'untested_client' },
      { id: 'steel', reason: 'missing_texture' }
    ]);
  });
});
