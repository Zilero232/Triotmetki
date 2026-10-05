import { z } from 'zod';

import { invokeCommand } from '@/shared/api';
import { COMMANDS } from '@/shared/config';

import type { InstallRequest } from './setup.types';

import { installOutcomeSchema, installPlanSchema } from './setup.schemas';

export const prepareInstall = (clientPath: string | null) =>
  invokeCommand({ command: COMMANDS.prepareInstall, schema: installPlanSchema, args: { clientPath } });

export const installModpack = (request: InstallRequest) =>
  invokeCommand({ command: COMMANDS.installModpack, schema: installOutcomeSchema, args: { request } });

export const readInstallerProfile = (path: string) =>
  invokeCommand({ command: COMMANDS.readInstallerProfile, schema: z.array(z.string()), args: { path } });
