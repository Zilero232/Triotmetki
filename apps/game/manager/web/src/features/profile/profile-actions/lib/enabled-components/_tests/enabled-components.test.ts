import { describe, expect, it } from 'vitest';

import { enabledComponents } from '../enabled-components';

describe('enabledComponents', () => {
  it('lists the enabled components only', () => {
    const installation = {
      components: [
        { id: 'core', state: 'enabled' as const, file: null, version: null },
        { id: 'hit_log', state: 'disabled' as const, file: null, version: null }
      ]
    };

    expect(enabledComponents(installation)).toEqual(['core']);
  });

  it('is empty before the installation is read', () => {
    expect(enabledComponents(undefined)).toEqual([]);
  });
});
