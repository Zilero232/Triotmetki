import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';
import { useTooltip } from '@/shared/lib/use-tooltip';
import { Icon } from '@/ui-kit';

import type { ServerChipProps } from './ServerChip.types';

import { HEADER } from '../../../config';

import s from './ServerChip.module.scss';

export const ServerChip = ({ url, compact }: ServerChipProps) => {
  const t = useT();
  const tip = useTooltip(`${t('serverCustomHint')} ${url}`);

  return (
    <div aria-label={t('serverCustom')} className={clsx(s.chip, compact && s.compact)} role='status' {...tip}>
      <Icon name='triangle-alert' size={HEADER.chipIconSize} tone='danger' />
      {!compact && <span className={s.label}>{t('serverCustom')}</span>}
    </div>
  );
};
