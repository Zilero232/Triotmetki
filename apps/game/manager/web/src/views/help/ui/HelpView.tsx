import { useTranslations } from 'use-intl';

import { CollectLogsButton } from '@/features/app/collect-logs';
import { ReportProblemButton } from '@/features/report/report-problem';
import { LINKS } from '@/shared/config';
import { Accordion, Card, ExternalLink, PageHeader } from '@/ui-kit';

import { useHelpView } from '../model/hooks';

export const HelpView = () => {
  const t = useTranslations('help');
  const { faq } = useHelpView();

  return (
    <>
      <PageHeader description={t('description')} title={t('title')} />
      <Card title={t('faqTitle')}>
        <Accordion items={faq} />
      </Card>
      <Card
        actions={
          <>
            <ExternalLink href={LINKS.site}>{t('site')}</ExternalLink>
            <CollectLogsButton />
            <ReportProblemButton />
          </>
        }
        description={t('supportDescription')}
        title={t('supportTitle')}
      />
    </>
  );
};
