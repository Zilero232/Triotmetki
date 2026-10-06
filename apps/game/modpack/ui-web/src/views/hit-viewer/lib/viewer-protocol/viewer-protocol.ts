import type * as z from 'zod/mini';

import { gameface } from '@/shared/api/gameface';

import type { ParseWithInput, ViewerMessage, ViewerSide, ViewerState } from './viewer-protocol.types';

import { viewerStateSchema } from './viewer-protocol.schemas';

const parseWith = <Schema extends z.ZodMiniType>({ schema, raw }: ParseWithInput<Schema>): z.infer<Schema> | null => {
  try {
    const parsed = schema.safeParse(JSON.parse(raw ?? ''));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const parseViewerState = (raw: string | null): ViewerState | null => parseWith({ schema: viewerStateSchema, raw });

export const footerOf = ({ battle, loading, approx, labels }: ViewerState): string => {
  if (!battle) {
    return labels.no_battles ?? '';
  }

  if (loading) {
    return labels.loading ?? '';
  }

  return (approx ? labels.approx : labels.hint) ?? '';
};

export const sideLabelsOf = (state: ViewerState | null): Record<ViewerSide, string> => {
  const labelOf = (side: ViewerSide): string => state?.tabs.find((tab) => tab.id === side)?.label ?? '';

  return { received: labelOf('received'), dealt: labelOf('dealt') };
};

export const sendViewer = (message: ViewerMessage): boolean => gameface.send(JSON.stringify(message));
