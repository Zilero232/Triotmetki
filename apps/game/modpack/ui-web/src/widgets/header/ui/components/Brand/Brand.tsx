import type { BrandProps } from './Brand.types';

import { useT } from '../../../../../entities/window-state';
import { useTooltip } from '../../../../../shared/lib/use-tooltip';
import { LogoMark } from '../../../../../shared/ui/logo-mark';
import { HEADER } from '../../../config';

import s from './Brand.module.scss';

export const Brand = ({ compact, dragRef, onRecentre }: BrandProps) => {
  const t = useT();
  const tip = useTooltip(t('dragHint'));

  return (
    <div ref={dragRef} aria-label={t('dragHint')} className={s.brand} onDoubleClick={onRecentre} {...tip}>
      <LogoMark className={s.mark} size={HEADER.logoSize} />
      {!compact && <span className={s.title}>{t('title')}</span>}
      {!compact && <span className={s.subtitle}>{t('subtitle')}</span>}
    </div>
  );
};
