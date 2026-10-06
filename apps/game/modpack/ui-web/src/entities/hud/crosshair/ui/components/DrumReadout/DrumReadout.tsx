import clsx from 'clsx';

import { TabularText } from '@/ui-kit';

import type { DrumReadoutProps } from './DrumReadout.types';

import { RETICLE_READOUTS } from '../../../config';
import { drumView } from '../../../lib/drum-view';
import { useDrumMotion } from '../../../model/hooks';
import { DrumCount } from '../DrumCount';
import { ShellSlot } from '../ShellSlot';

import s from './DrumReadout.module.scss';

const { drum } = RETICLE_READOUTS;

export const DrumReadout = ({ clip }: DrumReadoutProps) => {
  const view = drumView(clip);
  const motion = useDrumMotion(clip.loaded);
  const shell = drum.shell[view.density];
  const loadedPaint = clip.gold ? 'gold' : 'loaded';
  const asShells = view.mode === 'row' && clip.style === 'shells';
  const asBars = view.mode === 'row' && clip.style === 'bars';

  return (
    <div className={s.drum}>
      {clip.refill && <TabularText className={s.refill} text={clip.refill.value} />}
      {view.mode === 'count' && <DrumCount clip={clip} loadedPaint={loadedPaint} ticked={motion(clip.loaded) === 'eject'} />}
      {asShells &&
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
      {asBars &&
        view.cells.map((cell) => (
          <span key={cell.index} className={clsx(s.cell, cell.state === 'loaded' && s.cellLoaded, cell.state === 'refill' && s.cellRefill)} />
        ))}
    </div>
  );
};
