import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';
import { BindForm } from '@/features/account/bind-account';
import { Button, Icon } from '@/ui-kit';

import { openCodePage, openSite } from '../model/actions';
import { useAccountStatus } from '../model/hooks';

import s from './AccountCard.module.scss';

export const AccountCard = () => {
  const t = useT();
  const account = useAccountStatus();

  if (!account.state) {
    return null;
  }

  return (
    <section aria-label={t('accountTitle')} className={clsx(s.card, s[account.state.tone])}>
      <div className={s.head}>
        <span className={s.tile}>
          <Icon name={account.state.icon} size={22} tone={account.state.tone} />
        </span>
        <div className={s.titles}>
          <span className={s.caption}>{t('accountTitle')}</span>
          <span className={s.title}>{t(account.state.title)}</span>
          <span className={s.hint}>{t(account.state.hint)}</span>
          {account.status?.text && <span className={s.detail}>{account.status.text}</span>}
        </div>
        <div className={s.links}>
          <Button size='small' variant='ghost' onClick={openSite}>
            <span className={s.link}>
              <Icon className={s.linkIcon} name='external-link' size={14} tone='text' />
              {t('openSite')}
            </span>
          </Button>
        </div>
      </div>
      {account.showForm && (
        <div className={s.form}>
          <BindForm />
          <Button className={s.getCode} onClick={openCodePage}>
            {t('getCode')}
          </Button>
        </div>
      )}
    </section>
  );
};
