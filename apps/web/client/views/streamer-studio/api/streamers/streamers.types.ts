import type { CreateOverlayInput } from '@/entities/streamer/streamer';

export type SaveOverlayInput = {
  id: string | null;
  values: CreateOverlayInput;
};
