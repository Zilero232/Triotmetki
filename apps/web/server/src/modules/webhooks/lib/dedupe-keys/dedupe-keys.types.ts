import type { Session } from '@otmetki/schemas';

export type MarkGainedKeyInput = {
  source: Session['source'];
  accountId: bigint | number;
  tankId: number;
  marks: number;
};
