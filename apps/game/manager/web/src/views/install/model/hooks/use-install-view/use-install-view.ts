import { useSelectedClient } from '@/entities/client';
import { useInstallation } from '@/entities/installation';

export const useInstallView = () => {
  const { clientPath } = useSelectedClient();
  const { data: installation } = useInstallation(clientPath);

  return {
    isChange: installation?.installed ?? false
  };
};
