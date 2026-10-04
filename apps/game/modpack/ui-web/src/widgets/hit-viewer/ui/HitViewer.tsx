import type { ViewerSide } from '../lib/viewer-protocol';

import { IconButton } from '../../../shared/ui/icon-button';
import { Segmented } from '../../../shared/ui/segmented';
import { useHitViewer } from '../model/hooks/use-hit-viewer';
import { useInputPanel } from '../model/hooks/use-input-panel';
import { BattlePicker } from './components/BattlePicker';
import { HitMarkers } from './components/HitMarkers';
import { HitTable } from './components/HitTable';

import s from './HitViewer.module.scss';

export const HitViewer = () => {
  const { state, marks, footer, close, pickBattle, pickTab, pickHit } = useHitViewer();
  const panelRef = useInputPanel<HTMLDivElement>();

  if (!state) {
    return null;
  }

  const { labels, battle } = state;
  const tabs = state.tabs.map((tab) => ({ value: tab.id, label: `${tab.label} ${tab.count}` }));

  return (
    <div className={s.viewer}>
      <HitMarkers marks={marks} />
      <div ref={panelRef} className={s.panel}>
        <div className={s.header}>
          <span className={s.title}>{labels.title}</span>
          <IconButton icon='x' label={labels.close ?? ''} variant='ghost' onClick={close} />
        </div>
        {battle && <BattlePicker battles={state.battles} current={battle} label={labels.battles ?? ''} onPick={pickBattle} />}
        {state.tab && <Segmented<ViewerSide> items={tabs} label={labels.title ?? ''} value={state.tab} onSelect={pickTab} />}
        {battle && <HitTable labels={labels} rows={state.rows} selected={state.selected} onPick={pickHit} />}
        <div className={s.footer}>{footer}</div>
      </div>
      {battle && (
        <div className={s.card}>
          <span className={s.cardMap}>{battle.map}</span>
          <span className={s.cardMeta}>{battle.vehicle}</span>
          <span className={s.cardMeta}>{battle.date}</span>
        </div>
      )}
    </div>
  );
};
