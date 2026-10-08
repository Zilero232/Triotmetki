import { API_TIER_LIMITS } from '@otmetki/schemas';
import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, KeyFigure, KeyFigures, PageHeader } from '@/ui-kit';

import { API_REFERENCE, TIERS } from '../config';
import { ApiReference, ApiTerms, Quickstart, TiersTable, WebhooksDocs } from './components';

import s from './DevelopersPage.module.scss';

export const DevelopersPage = () => {
  const t = useTranslations('developers');

  return (
    <div className={s.root}>
      <PageHeader
        actions={
          <Link className={buttonVariants({ variant: 'primary', size: 'sm' })} href={ROUTES.account.developer}>
            {t('header.getKey')}
          </Link>
        }
        breadcrumbs={[{ label: t('header.title') }]}
        description={t('header.lead')}
        title={t('header.title')}
      />
      <KeyFigures>
        {TIERS.figures.map((metric) => (
          <KeyFigure key={metric} label={t(`figures.${metric}`)} value={API_TIER_LIMITS[TIERS.open][metric]} />
        ))}
        <KeyFigure label={t('figures.version')} value={API_REFERENCE.version} />
      </KeyFigures>
      <Quickstart />
      <ApiReference />
      <WebhooksDocs />
      <TiersTable />
      <ApiTerms />
    </div>
  );
};
