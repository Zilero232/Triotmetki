import clsx from 'clsx';

import { remBox } from '@/shared/lib/css-unit';
import { TabularText } from '@/ui-kit';

import type { DrumReadoutProps } from './DrumReadout.types';

import { RETICLE_READOUTS } from '../../../config';
import { drumView } from '../../../lib/drum-view';
import { useDrumMotion } from '../../../model/hooks';
import { DrumCount } from '../DrumCount';
import { ShellSlot } from '../ShellSlot';

import s from './DrumReadout.module.scss';

const { drum, clipCell } = RETICLE_READOUTS;

const cellSize = remBox(clipCell);

export const DrumReadout = ({ clip, style }: DrumReadoutProps) => {
  const view = drumView(clip);
  const motion = useDrumMotion(clip.loaded);
  const shell = drum.shell[view.density];
  const loadedPaint = clip.gold ? 'gold' : 'loaded';
  const isRow = view.mode === 'row';

  return (
    <div className={s.drum} style={style}>
      {clip.refill?.value && <TabularText className={s.refill} text={clip.refill.value} />}
      {!isRow && <DrumCount clip={clip} loadedPaint={loadedPaint} ticked={motion(clip.loaded) === 'eject'} />}
      {isRow &&
        clip.style === 'shells' &&
        view.cells.map((cell) => (
          <ShellSlot
            key={cell.index}
            height={shell.height}
            kind={clip.shell}
            loadedPaint={loadedPaint}
            motion={motion(cell.index)}
            progress={clip.refill?.progress ?? 0}
            state={cell.state}
            width={shell.width}
          />
        ))}
      {isRow &&
        clip.style === 'bars' &&
        view.cells.map((cell) => (
          <span
            key={cell.index}
            className={clsx(s.cell, cell.state === 'loaded' && s.cellLoaded, cell.state === 'refill' && s.cellRefill)}
            style={cellSize}
          />
        ))}
    </div>
  );
};
