import clsx from 'clsx';

import { remBox } from '@/shared/lib/css-unit';

import type { ShellSlotProps } from './ShellSlot.types';

import { ShellIcon } from '../ShellIcon';

import s from './ShellSlot.module.scss';

export const ShellSlot = ({ kind, state, loadedPaint, motion, progress, width, height }: ShellSlotProps) => (
  <span className={clsx(s.slot, motion === 'load' && s.load)} data-shell={state} style={remBox({ width, height })}>
    <ShellIcon height={height} kind={kind} paint={state === 'loaded' ? loadedPaint : 'spent'} width={width} />
    {state === 'refill' && (
      <span className={s.fill} style={{ height: `${String(Math.round(progress * 100))}%` }}>
        <ShellIcon height={height} kind={kind} paint='refill' width={width} />
      </span>
    )}
    {motion === 'eject' && (
      <span className={s.eject}>
        <ShellIcon height={height} kind={kind} paint={loadedPaint} width={width} />
      </span>
    )}
  </span>
);
