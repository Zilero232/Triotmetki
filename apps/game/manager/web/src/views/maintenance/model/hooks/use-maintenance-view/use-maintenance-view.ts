import { useSelectedClient } from '@/entities/client';
import { useInstallation } from '@/entities/installation';
import { useNavigation } from '@/shared/lib';

export const useMaintenanceView = () => {
  const { navigate } = useNavigation();
  const { clientPath } = useSelectedClient();
  const { data: installation } = useInstallation(clientPath);

  return {
    clientPath,
    isInstalled: installation?.installed ?? false,
    onChangeSelection: () => navigate({ page: 'install' })
  };
};
