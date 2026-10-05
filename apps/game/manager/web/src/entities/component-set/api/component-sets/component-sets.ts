import { z } from 'zod';

import type { DialogText } from '@/shared/api';

import { invokeCommand } from '@/shared/api';
import { COMMANDS } from '@/shared/config';

import type { ExportSetFileInput, ImportSetInput, RenameSetInput, SaveSetInput } from './component-sets.types';

import { setsViewSchema } from './component-sets.schemas';

export const listSets = () => invokeCommand({ command: COMMANDS.listSets, schema: setsViewSchema, args: {} });

export const saveSet = ({ name, components }: SaveSetInput) =>
  invokeCommand({ command: COMMANDS.saveSet, schema: setsViewSchema, args: { name, components } });

export const renameSet = ({ id, name }: RenameSetInput) => invokeCommand({ command: COMMANDS.renameSet, schema: setsViewSchema, args: { id, name } });

export const duplicateSet = ({ id, name }: RenameSetInput) =>
  invokeCommand({ command: COMMANDS.duplicateSet, schema: setsViewSchema, args: { id, name } });

export const deleteSet = (id: string) => invokeCommand({ command: COMMANDS.deleteSet, schema: setsViewSchema, args: { id } });

export const exportSet = (id: string) => invokeCommand({ command: COMMANDS.exportSet, schema: z.string(), args: { id } });

export const importSet = ({ code, name }: ImportSetInput) =>
  invokeCommand({ command: COMMANDS.importSet, schema: setsViewSchema, args: { code, name } });

export const exportSetFile = ({ id, text }: ExportSetFileInput) =>
  invokeCommand({ command: COMMANDS.exportSetFile, schema: z.string().nullable(), args: { id, text } });

export const exportSetsLibrary = (text: DialogText) =>
  invokeCommand({ command: COMMANDS.exportSetsLibrary, schema: z.string().nullable(), args: { text } });

export const importSetFile = (text: DialogText) =>
  invokeCommand({ command: COMMANDS.importSetFile, schema: setsViewSchema.nullable(), args: { text } });
