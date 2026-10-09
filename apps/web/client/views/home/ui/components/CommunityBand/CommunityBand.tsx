import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { Link } from '@/shared/i18n/navigation';
import { Band, SectionHeader } from '@/ui-kit';

import { HOME_COMMUNITY, HOME_ICON } from '../../../config';

import s from './CommunityBand.module.scss';

export const CommunityBand = () => {
  const t = useTranslations('home.community');
  const titleId = useId();

  return (
    <Band aria-labelledby={titleId} innerClassName={s.inner}>
      <SectionHeader id={titleId} title={t('title')} variant='display' />
      <ul className={s.grid}>
        {HOME_COMMUNITY.map(({ key, href, icon: Icon }) => (
          <li key={key} className={s.item}>
            <Link className={s.tile} data-kind={key} href={href}>
              <Icon aria-hidden className={s.emblem} size={HOME_ICON.community} />
              <span className={s.copy}>
                <span className={s.tileTitle}>{t(`${key}.title`)}</span>
                <span className={s.description}>{t(`${key}.description`)}</span>
              </span>
              <ArrowRight aria-hidden className={s.arrow} size={HOME_ICON.communityArrow} />
            </Link>
          </li>
        ))}
      </ul>
    </Band>
  );
};
