import { useFormatter, useTranslations } from 'next-intl';

import { CosmeticBadge, CosmeticName, CosmeticSurface } from '@/entities/player/cosmetics';
import { PlusBadge } from '@/features/plus/plus-gate';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { Badge, Button, buttonVariants, ConfirmDialog } from '@/ui-kit';

import type { CosmeticTileProps } from './CosmeticTile.types';

import s from './CosmeticTile.module.scss';

export const CosmeticTile = ({ item, action, isBusy, onBuy, onEquip }: CosmeticTileProps) => {
  const t = useTranslations('cosmetics');
  const format = useFormatter();
  const { code, slot, source, price } = item;
  const profileSlot = slot === 'overlayTheme' ? null : slot;

  return (
    <article className={s.root} data-state={action}>
      <div className={s.preview}>
        {slot === 'badge' ? (
          <CosmeticBadge code={code} />
        ) : (
          <CosmeticSurface banner={slot === 'frame' ? null : code} className={s.surface} frame={slot === 'frame' ? code : null}>
            <CosmeticName code={code} />
          </CosmeticSurface>
        )}
      </div>
      <div className={s.meta}>
        <span className={s.name}>
          <CosmeticName code={code} />
        </span>
        {source === 'plus' && <PlusBadge />}
        {source === 'season' && <Badge tone='steel'>{t('seasonReward')}</Badge>}
        {source === 'default' && <Badge tone='neutral'>{t('free')}</Badge>}
      </div>
      <div className={s.action}>
        {action === 'equip' && profileSlot && (
          <Button disabled={isBusy} size='sm' variant='secondary' onClick={() => onEquip({ slot: profileSlot, code })}>
            {t('equip')}
          </Button>
        )}
        {action === 'unequip' && profileSlot && (
          <Button disabled={isBusy} size='sm' variant='ghost' onClick={() => onEquip({ slot: profileSlot, code: null })}>
            {t('equipped')} · {t('unequip')}
          </Button>
        )}
        {action === 'buy' && (
          <ConfirmDialog
            trigger={
              <Button disabled={isBusy} size='sm'>
                {t('buy', { price: format.number(price ?? 0) })}
              </Button>
            }
            cancelLabel={t('cancel')}
            confirmLabel={t('buy', { price: format.number(price ?? 0) })}
            description={t('buyConfirmDescription')}
            isPending={isBusy}
            title={t('buyConfirmTitle', { price: price ?? 0 })}
            onConfirm={() => onBuy(code)}
          />
        )}
        {action === 'short' && (
          <span className={s.note}>
            {t('buy', { price: format.number(price ?? 0) })} · {t('notEnough')}
          </span>
        )}
        {action === 'owned' && <span className={s.note}>{t('owned')}</span>}
        {action === 'plus' && (
          <Link className={buttonVariants({ variant: 'premium', size: 'sm' })} href={ROUTES.plus}>
            {price === null ? t('plusOnly') : t('buy', { price: format.number(price) })}
          </Link>
        )}
      </div>
    </article>
  );
};
