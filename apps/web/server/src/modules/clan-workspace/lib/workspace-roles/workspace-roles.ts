import type { ClanRole } from '../../../../../generated';

import { WORKSPACE_ROLES } from '../../config/roles.constants';

const OFFICERS: ReadonlySet<ClanRole> = new Set(WORKSPACE_ROLES.officers);
const OWNERS: ReadonlySet<ClanRole> = new Set(WORKSPACE_ROLES.owners);

export const isClanOfficer = (role: ClanRole | null | undefined): boolean => role !== null && role !== undefined && OFFICERS.has(role);

export const canOwnWorkspace = (role: ClanRole | null | undefined): boolean => role !== null && role !== undefined && OWNERS.has(role);
