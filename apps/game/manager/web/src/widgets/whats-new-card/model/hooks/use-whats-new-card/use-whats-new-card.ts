import { useLocale } from 'use-intl';

import { useWhatsNew } from '@/entities/changelog';
import { useSelectedClient } from '@/entities/client';
import { pickLocalized, useNavigation } from '@/shared/lib';

export const useWhatsNewCard = () => {
  const locale = useLocale();
  const { navigate } = useNavigation();
  const { clientPath } = useSelectedClient();
  const { data } = useWhatsNew(clientPath);
  const version = data?.installedVersion ?? null;
  const release = data?.releases.find((item) => item.version === version) ?? null;

  return {
    isVisible: data?.showCard === true && version !== null,
    version: version ?? '',
    notes: release?.notes ? pickLocalized({ text: release.notes, locale }) : null,
    changed: release?.changes.length ?? 0,
    onOpen: () => navigate({ page: 'updates' })
  };
};
