import { OtmetkiLogoIcon } from '@otmetki/icons';
import { History } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { HOME_ICON, HOME_MODPACK } from '../../../../../config';

import s from './ModpackPreview.module.scss';

export const ModpackPreview = () => {
  const t = useTranslations('home.modpack.preview');

  return (
    <div aria-hidden className={s.root}>
      <div className={s.window}>
        <div className={s.bar}>
          <span className={s.lights}>
            <span />
            <span />
            <span />
          </span>
          <span className={s.name}>
            <OtmetkiLogoIcon size={HOME_ICON.toggle} />
            {t('title')}
          </span>
        </div>
        <div className={s.body}>
          <span className={s.preset}>{t('preset')}</span>
          <ul className={s.list}>
            {HOME_MODPACK.preview.map(({ key, isOn }) => (
              <li key={key} className={s.row}>
                <span className={s.label}>{t(`items.${key}`)}</span>
                <span className={s.toggle} data-on={isOn} />
              </li>
            ))}
          </ul>
          <span className={s.foot}>
            <History size={HOME_ICON.toggle} />
            {t('patch')}
          </span>
        </div>
      </div>
    </div>
  );
};
