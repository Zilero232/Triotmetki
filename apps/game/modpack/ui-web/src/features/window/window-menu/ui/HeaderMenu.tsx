import { useT } from '@/entities/window/window-state';
import { Button, IconButton, Segmented } from '@/ui-kit';

import type { HeaderMenuProps } from './HeaderMenu.types';

import { LANGUAGE_ITEMS } from '../config';
import { selectLanguage } from '../model/actions';
import { useHeaderMenu } from '../model/hooks';
import { ZoomControl } from './components';

import s from './HeaderMenu.module.scss';

export const HeaderMenu = ({ frame, language }: HeaderMenuProps) => {
  const t = useT();
  const menu = useHeaderMenu({ onReset: frame.onReset });

  return (
    <div ref={menu.ref} className={s.anchor}>
      <IconButton aria-expanded={menu.isOpen} aria-haspopup='menu' icon='ellipsis' label={t('headerMenu')} variant='ghost' onClick={menu.toggle} />
      {menu.isOpen && (
        <div aria-label={t('headerMenu')} className={s.menu} role='menu'>
          <div className={s.row}>
            <span className={s.label}>{t('zoomLabel')}</span>
            <ZoomControl frame={frame} />
          </div>
          <div className={s.row}>
            <span className={s.label}>{t('language')}</span>
            <Segmented items={LANGUAGE_ITEMS} label={t('language')} value={language} onSelect={selectLanguage} />
          </div>
          <div className={s.footer}>
            <Button size='small' tooltip={t('windowResetHint')} variant='ghost' onClick={menu.reset}>
              {t('windowReset')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
