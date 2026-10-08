import clsx from 'clsx';

import { ClientIcon, HudText } from '@/ui-kit';

import type { Wn8LineProps } from './Wn8Line.types';

import { BATTLE_PROGRESS } from '../../../config';

import s from './Wn8Line.module.scss';

export const Wn8Line = ({ data, isDivided }: Wn8LineProps) => (
  <div className={clsx(s.line, isDivided && s.divided)}>
    <ClientIcon className={s.icon} icon={data.icon} size={BATTLE_PROGRESS.wn8IconSize} />
    <span className={s.label}>{data.label}</span>
    <HudText className={s.value} color={data.color} text={data.value} />
    <HudText className={s.note} text={data.note} />
  </div>
);
