import { describe, expect, it } from 'vitest';

import { RECRUITING } from '../../../config/recruiting.constants';
import { isRecruitingOfficer } from '../clan-officer';

describe('isRecruitingOfficer', () => {
  it('accepts every configured officer role', () => {
    for (const role of RECRUITING.officerRoles) {
      expect(isRecruitingOfficer(role)).toBe(true);
    }
  });

  it('refuses rank-and-file members and non-members', () => {
    expect(isRecruitingOfficer('private')).toBe(false);
    expect(isRecruitingOfficer(null)).toBe(false);
  });
});
