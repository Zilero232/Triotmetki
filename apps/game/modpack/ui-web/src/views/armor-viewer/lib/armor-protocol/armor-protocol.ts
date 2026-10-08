import type * as z from 'zod/mini';

import type { ArmorDrawReport, ArmorMapData, ArmorReadoutData } from '@/entities/armor/armor-map';

import { gameface } from '@/shared/api/gameface';
import { stepBack } from '@/shared/lib/escape-stack';

import type { ArmorMessage, ArmorState, ArmorStatus, ParseWithInput } from './armor-protocol.types';

import { armorHoverSchema, armorMapStateSchema, armorStateSchema, armorStatusSchema } from './armor-protocol.schemas';

const parseWith = <Schema extends z.ZodMiniType>({ schema, raw }: ParseWithInput<Schema>): z.infer<Schema> | null => {
  if (raw === null || raw === '') {
    return null;
  }

  try {
    const parsed = schema.safeParse(JSON.parse(raw));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const parseArmorState = (raw: string | null): ArmorState | null => parseWith({ schema: armorStateSchema, raw });

export const parseArmorStatus = (raw: string | null): ArmorStatus | null => parseWith({ schema: armorStatusSchema, raw });

export const parseArmorMap = (raw: string | null): ArmorMapData | null => parseWith({ schema: armorMapStateSchema, raw });

export const parseArmorHover = (raw: string | null): ArmorReadoutData | null => parseWith({ schema: armorHoverSchema, raw });

export const sendArmor = (message: ArmorMessage): boolean => gameface.send(JSON.stringify(message));

export const answerEscape = (): void => {
  if (!stepBack()) {
    sendArmor({ command: 'close' });
  }
};

export const drawReportText = ({ width, height, cells, ms }: ArmorDrawReport): string =>
  `canvas ${String(width)}x${String(height)}, ${String(cells)} cells drawn in ${String(ms)} ms`;
