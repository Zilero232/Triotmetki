import type { EscapeLayerKind } from '@/shared/lib/escape-stack';

export type UseEscapeLayerInput = {
  kind: EscapeLayerKind;
  active?: boolean;
  onEscape: () => void;
};
