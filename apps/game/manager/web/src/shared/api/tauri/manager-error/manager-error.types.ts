import type { z } from 'zod';

import type { managerErrorCodeSchema } from './manager-error.schemas';

export type ManagerErrorCode = z.infer<typeof managerErrorCodeSchema>;

export type ManagerErrorInit = {
  code: ManagerErrorCode;
  message: string;
};
