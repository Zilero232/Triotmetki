import clsx from 'clsx';

import { TabularText } from '@/ui-kit';

import type { DrumCountProps } from './DrumCount.types';

import { RETICLE_READOUTS } from '../../../config';
import { ShellIcon } from '../ShellIcon';

import s from './DrumCount.module.scss';

const { full } = RETICLE_READOUTS.drum.shell;

export const DrumCount = ({ clip, loadedPaint, ticked }: DrumCountProps) => (
  <div className={s.counter}>
    {clip.style === 'shells' && <ShellIcon height={full.height} kind={clip.shell} paint={loadedPaint} width={full.width} />}
    <TabularText key={clip.loaded} className={clsx(s.count, ticked && s.tick)} text={String(clip.loaded)} />
    <TabularText className={s.total} text={`/${String(clip.size)}`} />
  </div>
);
