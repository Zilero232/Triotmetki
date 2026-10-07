import { IconButton } from '@/ui-kit';

import type { ViewerBarProps } from './ViewerBar.types';

import { BattlePicker } from '../BattlePicker';
import { SideTabs } from '../SideTabs';

import s from './ViewerBar.module.scss';

export const ViewerBar = ({ state, sideLabels, onClose, onTab, onBattle }: ViewerBarProps) => {
  const { labels, battle, battles, tabs, tab } = state;

  return (
    <div className={s.bar}>
      <div className={s.title}>
        <IconButton icon='x' label={labels.close ?? ''} variant='ghost' onClick={onClose} />
        <span className={s.titleText}>{labels.title}</span>
      </div>
      {tab && (
        <div className={s.tabs}>
          <SideTabs label={labels.title ?? ''} tabs={tabs} value={tab} onSelect={onTab} />
        </div>
      )}
      {battle && (
        <div className={s.battle}>
          <BattlePicker
            battles={battles}
            current={battle}
            label={labels.pick_battle ?? labels.battles ?? ''}
            labels={labels}
            sideLabels={sideLabels}
            onPick={onBattle}
          />
        </div>
      )}
    </div>
  );
};
