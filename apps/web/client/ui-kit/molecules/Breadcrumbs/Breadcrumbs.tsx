import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { useBreadcrumbs } from '@/shared/lib/use-breadcrumbs';
import { JsonLd } from '@/shared/seo/json-ld';

import type { BreadcrumbsProps } from './Breadcrumbs.types';

import s from './Breadcrumbs.module.scss';

export const Breadcrumbs = ({ items, isCurrentAccent = false, withSchema = true, className }: BreadcrumbsProps) => {
  const t = useTranslations('common');
  const { crumbs, jsonLd } = useBreadcrumbs(items);

  return (
    <nav aria-label={t('breadcrumbs')} className={className}>
      <ol className={s.list} data-accent={isCurrentAccent}>
        {crumbs.map(({ key, href, label, isCurrent }) => (
          <li key={key} className={s.item}>
            {href ? (
              <Link className={s.link} href={href}>
                {label}
              </Link>
            ) : (
              <span aria-current={isCurrent ? 'page' : undefined}>{label}</span>
            )}
          </li>
        ))}
      </ol>
      {withSchema && jsonLd && <JsonLd data={jsonLd} />}
    </nav>
  );
};
