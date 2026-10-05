import { describe, expect, it } from 'vitest';

import { needsInstall } from '@/entities/profile';

describe('needsInstall', () => {
  it('applies a settings-only profile without the install wizard', () => {
    expect(needsInstall({ installed: null, enabled: ['core'] })).toBe(false);
  });

  it('skips the wizard when the same components are already on', () => {
    expect(needsInstall({ installed: ['core', 'marks_panel'], enabled: ['marks_panel', 'core'] })).toBe(false);
  });

  it('opens the wizard when a component has to be added', () => {
    expect(needsInstall({ installed: ['core', 'marks_panel'], enabled: ['core'] })).toBe(true);
  });

  it('opens the wizard when a component has to be removed', () => {
    expect(needsInstall({ installed: ['core'], enabled: ['core', 'hit_log'] })).toBe(true);
  });
});
