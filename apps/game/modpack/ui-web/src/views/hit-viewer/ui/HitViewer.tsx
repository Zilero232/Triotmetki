import { IconButton } from '@/ui-kit';

import { useCameraDrag } from '../model/hooks/use-camera-drag';
import { useHitViewer } from '../model/hooks/use-hit-viewer';
import { useViewerFrame } from '../model/hooks/use-viewer-frame';
import { useViewerKeys } from '../model/hooks/use-viewer-keys';
import { BattlePicker } from './components/BattlePicker';
import { HitDetails } from './components/HitDetails';
import { HitTable } from './components/HitTable';
import { SideTabs } from './components/SideTabs';
import { ViewerEmpty } from './components/ViewerEmpty';

import s from './HitViewer.module.scss';

export const HitViewer = () => {
  const viewer = useHitViewer();
  const surfaceRef = useCameraDrag(viewer.move);
  const frame = useViewerFrame();

  useViewerKeys({ onStep: viewer.stepHit, onSwitchTab: viewer.switchTab });

  const { state, selectedRow, sideLabels } = viewer;

  if (!state) {
    return null;
  }

  const { labels, battle } = state;

  return (
    <div className={s.viewer}>
      <div ref={surfaceRef} className={s.surface} />
      <div className={s.frame} style={frame}>
        <div className={s.bar}>
          <div className={s.title}>
            <IconButton icon='x' label={labels.close ?? ''} variant='ghost' onClick={viewer.close} />
            <span className={s.titleText}>{labels.title}</span>
          </div>
          {state.tab && (
            <div className={s.tabs}>
              <SideTabs label={labels.title ?? ''} tabs={state.tabs} value={state.tab} onSelect={viewer.pickTab} />
            </div>
          )}
          {battle && (
            <div className={s.battle}>
              <BattlePicker
                battles={state.battles}
                current={battle}
                label={labels.pick_battle ?? labels.battles ?? ''}
                labels={labels}
                sideLabels={sideLabels}
                onPick={viewer.pickBattle}
              />
            </div>
          )}
        </div>
        {battle ? (
          <>
            <div className={s.column}>
              <div className={s.list}>
                <HitTable labels={labels} rows={state.rows} selected={state.selected} onPick={viewer.pickHit} />
              </div>
              {selectedRow && (
                <div className={s.details}>
                  <HitDetails labels={labels} row={selectedRow} />
                </div>
              )}
            </div>
            <div className={s.footer}>
              <span className={s.hint}>{viewer.footer}</span>
            </div>
          </>
        ) : (
          <ViewerEmpty labels={labels} onClose={viewer.close} />
        )}
      </div>
    </div>
  );
};
