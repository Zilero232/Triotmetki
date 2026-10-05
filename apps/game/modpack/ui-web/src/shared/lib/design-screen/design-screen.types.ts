import type { ClientSize } from '@/shared/api/gameface';

export type DesignScreenInput = { client: ClientSize | null; scale: number; fallback: ClientSize };
