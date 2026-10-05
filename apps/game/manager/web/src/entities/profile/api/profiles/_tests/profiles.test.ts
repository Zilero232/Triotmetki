import profiles from '@contract/profiles.json';
import { describe, expect, it } from 'vitest';

import { profilesViewSchema } from '@/entities/profile';

describe('profilesViewSchema', () => {
  it('parses the profiles the game and the manager share', () => {
    const view = profilesViewSchema.parse(profiles);

    expect(view.profiles.find((profile) => profile.active)?.id).toBe(view.active);
  });

  it('parses the component list a profile keeps and the sets still waiting to move in', () => {
    const view = profilesViewSchema.parse(profiles);

    expect(view.profiles[0]?.installed).toEqual(['core', 'companion', 'marks_panel']);
    expect(view.pendingSets).toBe(2);
  });
});
