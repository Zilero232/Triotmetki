'use client';

import { useModpackAvailability } from '@/entities/mod/modpack-release';

export const useModpackPromo = () => {
  const { isPublished, manager } = useModpackAvailability();

  return { isReleased: isPublished, downloadKey: manager === null ? 'downloadModpack' : 'download' } as const;
};
