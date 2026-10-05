import { describe, expect, it } from 'vitest';

import { WORKSPACE_ROLES } from '../../../config/roles.constants';
import { canOwnWorkspace, isClanOfficer } from '../workspace-roles';

describe('isClanOfficer', () => {
  it('accepts every officer role and refuses the ranks', () => {
    for (const role of WORKSPACE_ROLES.officers) {
      expect(isClanOfficer(role)).toBe(true);
    }

    expect(isClanOfficer('private')).toBe(false);
    expect(isClanOfficer('recruit')).toBe(false);
    expect(isClanOfficer(undefined)).toBe(false);
  });
});

describe('canOwnWorkspace', () => {
  it('is limited to a subset of officers', () => {
    for (const role of WORKSPACE_ROLES.owners) {
      expect(isClanOfficer(role)).toBe(true);
      expect(canOwnWorkspace(role)).toBe(true);
    }

    expect(canOwnWorkspace('juniorOfficer')).toBe(false);
  });
});
