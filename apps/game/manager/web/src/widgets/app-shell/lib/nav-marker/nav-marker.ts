import type { PatchStatusKind } from '@/entities/patch-report';

import type { NavMarker, NavMarkerInput } from './nav-marker.types';

import { NAV_MARKER } from '../../config';

const problemKinds = new Set<PatchStatusKind>(NAV_MARKER.problemKinds);

export const navMarker = ({ section, statusKind, failureCount }: NavMarkerInput): NavMarker | null => {
  if (section === 'home' && statusKind !== null && problemKinds.has(statusKind)) {
    return { kind: 'problem', count: null };
  }

  if (section === 'components' && failureCount > 0) {
    return { kind: 'failures', count: failureCount };
  }

  return null;
};
