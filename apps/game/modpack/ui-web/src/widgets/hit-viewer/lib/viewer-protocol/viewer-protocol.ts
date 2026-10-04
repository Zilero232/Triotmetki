import type * as z from 'zod/mini';

import type { ViewerMarks, ViewerMessage, ViewerState } from './viewer-protocol.types';

import { gameface } from '../../../../shared/api/gameface';
import { viewerMarksSchema, viewerStateSchema } from './viewer-protocol.schemas';

const parseWith = <Schema extends z.ZodMiniType>(schema: Schema, raw: string | null): z.infer<Schema> | null => {
  try {
    const parsed = schema.safeParse(JSON.parse(raw ?? ''));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const parseViewerState = (raw: string | null): ViewerState | null => parseWith(viewerStateSchema, raw);

export const parseViewerMarks = (raw: string | null): ViewerMarks | null => parseWith(viewerMarksSchema, raw);

export const footerOf = ({ battle, loading, approx, labels }: ViewerState): string => {
  if (!battle) {
    return labels.no_battles ?? '';
  }

  if (loading) {
    return labels.loading ?? '';
  }

  return (approx ? labels.approx : labels.hint) ?? '';
};

export const sendViewer = (message: ViewerMessage): boolean => gameface.send(JSON.stringify(message));
