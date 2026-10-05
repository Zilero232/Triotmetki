import type { PatchStatusKind } from '@/entities/patch-report';
import type { SectionId } from '@/shared/lib';

export type NavMarker = {
  kind: 'failures' | 'problem';
  count: number | null;
};

export type NavMarkerInput = {
  section: SectionId;
  statusKind: PatchStatusKind | null;
  failureCount: number;
};
