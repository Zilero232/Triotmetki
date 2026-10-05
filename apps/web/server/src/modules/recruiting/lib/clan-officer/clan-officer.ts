import type { ClanRole } from '../../../../../generated';

import { RECRUITING } from '../../config/recruiting.constants';

const OFFICER_ROLES: ReadonlySet<ClanRole> = new Set(RECRUITING.officerRoles);

export const isRecruitingOfficer = (role: ClanRole | null | undefined): boolean => role !== null && role !== undefined && OFFICER_ROLES.has(role);
