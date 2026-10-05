import { useTranslations } from 'next-intl';

import s from './RowActionsHeader.module.scss';

export const RowActionsHeader = () => {
  const t = useTranslations('common.rowActions');

  return <span className={s.root}>{t('column')}</span>;
};
