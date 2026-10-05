import { useTranslations } from 'next-intl';

import { PROMO_ICON, PROMO_MOCK } from '../../../../../config';
import { MockWindow } from '../MockWindow';

import s from './MockManager.module.scss';

export const MockManager = () => {
  const t = useTranslations('promo.mock.manager');

  return (
    <MockWindow title={t('title')}>
      <div className={s.layout}>
        <ul className={s.side}>
          {PROMO_MOCK.manager.side.map(({ key, icon: Icon, isActive }) => (
            <li key={key} className={s.sideItem} data-active={isActive || undefined}>
              <Icon size={PROMO_ICON.mockSide} />
            </li>
          ))}
        </ul>
        <div className={s.main}>
          <p className={s.preset}>{t('preset')}</p>
          <ul className={s.toggles}>
            {PROMO_MOCK.manager.toggles.map(({ key, isOn }) => (
              <li key={key} className={s.toggle}>
                <span>{t(`items.${key}`)}</span>
                <span className={s.switch} data-on={isOn || undefined} />
              </li>
            ))}
          </ul>
          <div className={s.progress}>
            <span className={s.progressLabel}>{t('migrate')}</span>
            <span className={s.track}>
              <span className={s.fill} style={{ '--value': `${PROMO_MOCK.manager.progress}%` }} />
            </span>
          </div>
        </div>
      </div>
    </MockWindow>
  );
};
