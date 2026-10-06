import { invokeCommand } from '@/shared/api';
import { COMMANDS } from '@/shared/config';

import { hangarLooksStatusSchema } from './hangar-looks-status.schemas';

export const getHangarLooksStatus = (clientPath: string | null) =>
  invokeCommand({ command: COMMANDS.getHangarLooksStatus, schema: hangarLooksStatusSchema, args: { clientPath } });
