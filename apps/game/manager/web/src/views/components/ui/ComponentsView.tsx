import { useTranslations } from 'use-intl';

import { HelpTip, PageHeader } from '@/ui-kit';
import { ComponentCatalog } from '@/widgets/component-catalog';
import { GameHealthCard } from '@/widgets/game-health-card';

export const ComponentsView = () => {
  const t = useTranslations();

  return (
    <>
      <PageHeader
        description={t('components.description')}
        help={<HelpTip label={t('help.tipLabel')}>{t('help.tips.components')}</HelpTip>}
        title={t('components.title')}
      />
      <GameHealthCard />
      <ComponentCatalog />
    </>
  );
};
